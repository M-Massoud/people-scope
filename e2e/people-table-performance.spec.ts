import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fixturePerson, peopleFixture } from "../tests/fixtures/people";
import { buildPeopleReport } from "@/modules/reports/server";
import { buildPeoplePage } from "@/modules/people/server";

const snapshot = {
  ...peopleFixture,
  people: Array.from({ length: 5000 }, (_, index) => fixturePerson(index)),
};
async function fixtures(page: Page) {
  await page.route("https://randomuser.me/api/portraits/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/reports?**", (route) =>
    route.fulfill({
      json: buildPeopleReport(
        snapshot,
        new URL(route.request().url()).searchParams,
      ),
    }),
  );
  await page.route("**/api/people?**", (route) =>
    route.fulfill({
      json: buildPeoplePage(
        snapshot,
        new URL(route.request().url()).searchParams,
      ),
    }),
  );
}
type TableMode = "regular" | "optimized";
async function enableBenchmark(page: Page, mode: TableMode = "optimized") {
  await page.addInitScript((implementation) => {
    (
      window as Window & { __PEOPLE_TABLE_BENCHMARK__?: TableMode }
    ).__PEOPLE_TABLE_BENCHMARK__ = implementation;
  }, mode);
}

async function selectSize(page: Page, size: number) {
  await page.getByRole("combobox", { name: "Rows per page" }).click();
  await page
    .getByRole("option", { name: size.toLocaleString("en-US"), exact: true })
    .click();
}

test("benchmark recording is test-controlled and handles cached table pages", async ({
  page,
}) => {
  await fixtures(page);
  // Old shared URLs must not enable recording.
  await page.goto("/profile-timeline?explore=1&measure=1");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(25);
  await selectSize(page, 100);
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(100);
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("measure")
          .filter((e) => e.name.startsWith("People table:")).length,
    ),
  ).toBe(0);
  await enableBenchmark(page);
  await page.goto("/profile-timeline?explore=1&pageSize=25");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(25);
  for (const size of [100, 25]) {
    await selectSize(page, size);
    await expect
      .poll(() =>
        page.evaluate(
          (target) =>
            performance
              .getEntriesByName("People table: update")
              .some(
                (e) => (e as PerformanceMeasure).detail.pageSize === target,
              ),
          size,
        ),
      )
      .toBe(true);
    await expect(
      page.getByTestId("people-table").locator("tbody tr"),
    ).toHaveCount(size);
  }
  const measures = await page.evaluate(() =>
    performance
      .getEntriesByType("measure")
      .filter((e) => e.name.startsWith("People table:"))
      .map((e) => ({ name: e.name, duration: e.duration })),
  );
  expect(
    measures.filter((e) => e.name === "People table: update"),
  ).toHaveLength(2);
  expect(
    measures.filter((e) => e.name === "People table: commit"),
  ).toHaveLength(2);
  // Initial 25 and new 100 request. Returning to fresh cached 25 needs no request.
  expect(
    measures.filter((e) => e.name === "People table: request"),
  ).toHaveLength(2);
});

test("regular benchmark component renders every requested row", async ({
  page,
}) => {
  await fixtures(page);
  await enableBenchmark(page, "regular");
  await page.goto("/profile-timeline?explore=1&pageSize=5000");
  const table = page.getByTestId("people-table");
  await expect(table).toBeVisible({ timeout: 30_000 });
  expect(await table.locator("[data-person-row]").count()).toBe(5000);
});

type LongTask = { startTime: number; duration: number };
type TimingWindow = Window & { tableLongTasks: LongTask[] };
type TableRun = {
  run: number;
  updateMs: number;
  selectionToCommitMs: number;
  requestMs: number;
  afterResponseToCommitMs: number | null;
  commitToPaintOpportunityMs: number;
  longTaskCount: number;
  longestTaskMs: number;
  longTaskOverlapMs: number;
  mountedRows: number;
  domElements: number;
};

// Round only terminal output; JSON retains the original measurements.
function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const summaryMetrics = [
  ["updateMs", "Overall table update"],
  ["requestMs", "Test data request + JSON"],
  ["selectionToCommitMs", "Selection to DOM update"],
  ["afterResponseToCommitMs", "Response to DOM update"],
  ["commitToPaintOpportunityMs", "DOM update to paint opportunity"],
  ["longestTaskMs", "Longest blocking task"],
  ["longTaskOverlapMs", "Time inside long tasks"],
] as const;

function formatCountRange(values: number[]) {
  const min = Math.min(...values).toLocaleString("en-US");
  const max = Math.max(...values).toLocaleString("en-US");
  return min === max ? min : `${min}–${max}`;
}

function formatSummaryRow(label: string, values: string[]) {
  return `  ${label.padEnd(33)}${values.map((value) => value.padStart(12)).join("")}`;
}

for (const cpu of [1, 6]) {
  test(`compare regular and optimized people tables at ${cpu}x CPU slowdown`, async ({
    browser,
  }, testInfo) => {
    test.skip(
      process.env.TABLE_BENCHMARK !== "1",
      "Opt-in performance experiment",
    );
    test.setTimeout(600_000);
    const cpuLabel = cpu === 1 ? "Normal CPU speed" : `${cpu}x CPU slowdown`;
    const comparisons: Array<{
      implementation: TableMode;
      medianUpdateMs: number;
      medianLongestTaskMs: number;
      mountedRows: number;
      domElements: number;
    }> = [];
    for (const implementation of ["regular", "optimized"] as const) {
      const startedAt = performance.now();
      const componentName =
        implementation === "regular" ? "PeopleTable" : "OptimizedPeopleTable";
      console.log(`\nPEOPLE TABLE PERFORMANCE — ${componentName} · ${cpuLabel}
  Switching from 25 to 5,000 rows · 5 runs
  Fixed test data · portraits blocked · production build\n`);
      const runs: TableRun[] = [];
      for (let run = 1; run <= 5; run++) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          reducedMotion: "reduce",
        });
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(180_000);
          const cdp = await context.newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
          await page.addInitScript(() => {
            const target = window as unknown as TimingWindow;
            target.tableLongTasks = [];
            new PerformanceObserver((list) => {
              target.tableLongTasks.push(
                ...list.getEntries().map((e) => ({
                  startTime: e.startTime,
                  duration: e.duration,
                })),
              );
            }).observe({ type: "longtask" });
          });
          await fixtures(page);
          await enableBenchmark(page, implementation);
          await page.goto("/profile-timeline?explore=1");
          await expect(
            page.getByTestId("people-table").locator("tbody tr"),
          ).toHaveCount(25, { timeout: 60_000 });
          await selectSize(page, 5000);
          // Completion is the instrumented update, NOT a 5000 DOM-row threshold.
          await expect
            .poll(
              () =>
                page.evaluate(
                  () =>
                    performance.getEntriesByName("People table: update").length,
                ),
              { timeout: 180_000 },
            )
            .toBe(1);
          const result = await page.evaluate(() => {
            const update = performance.getEntriesByName(
              "People table: update",
            )[0];
            const commit = performance.getEntriesByName(
              "People table: commit",
            )[0];
            const requests = performance
              .getEntriesByName("People table: request")
              .filter((e) => e.startTime >= update.startTime);
            const end = update.startTime + update.duration;
            const tasks = (
              window as unknown as TimingWindow
            ).tableLongTasks.filter(
              (e) =>
                e.startTime < end &&
                e.startTime + e.duration > update.startTime,
            );
            return {
              updateMs: update.duration,
              selectionToCommitMs: commit.duration,
              requestMs: requests.reduce((sum, e) => sum + e.duration, 0),
              afterResponseToCommitMs: requests.length
                ? commit.startTime +
                  commit.duration -
                  Math.max(...requests.map((e) => e.startTime + e.duration))
                : null,
              commitToPaintOpportunityMs: update.duration - commit.duration,
              longTaskCount: tasks.length,
              longestTaskMs: Math.max(0, ...tasks.map((e) => e.duration)),
              longTaskOverlapMs: tasks.reduce(
                (sum, e) =>
                  sum +
                  Math.max(
                    0,
                    Math.min(end, e.startTime + e.duration) -
                      Math.max(update.startTime, e.startTime),
                  ),
                0,
              ),
              mountedRows: document.querySelectorAll(
                '[data-testid="people-table"] [data-person-row]',
              ).length,
              domElements: document.querySelectorAll("*").length,
            };
          });
          expect(result.mountedRows).toBeGreaterThan(0);
          if (implementation === "regular")
            expect(result.mountedRows).toBe(5000);
          else expect(result.mountedRows).toBeLessThan(80);
          await expect(page.getByTestId("people-table")).toHaveAttribute(
            "aria-rowcount",
            "5001",
          );
          expect(result.requestMs).toBeGreaterThan(0);
          runs.push({ run, ...result });
          console.log(
            `  Run ${run}/5 | Table update: ${formatDuration(result.updateMs)} | Request: ${formatDuration(result.requestMs)} | Longest blocking task: ${formatDuration(result.longestTaskMs)}`,
          );
          const viewport = page
            .getByTestId("people-scroll-area")
            .locator('[data-slot="scroll-area-viewport"]');
          await viewport.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          const lastRow = page
            .getByTestId("people-table")
            .locator('[aria-rowindex="5001"]');
          await expect(lastRow).toBeVisible();
          const expectedLast = buildPeoplePage(
            snapshot,
            new URLSearchParams("pageSize=5000"),
          ).items.at(-1)!;
          await expect(lastRow).toHaveAttribute(
            "data-person-id",
            expectedLast.login.uuid,
          );
        } finally {
          await context.close();
        }
      }
      const summary = Object.fromEntries(
        summaryMetrics.map(([metric]) => {
          const values = runs.map((r) => r[metric]!).sort((a, b) => a - b);
          return [
            metric,
            { median: values[2], min: values[0], max: values[4] },
          ];
        }),
      );
      const elapsedMs = performance.now() - startedAt;
      const report = {
        date: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        cpu,
        viewport: "1280x900",
        profileCount: 5000,
        implementation,
        elapsedMs,
        mode: "production; fixtures; portraits blocked; fresh browser context per run; reduced motion; no trace/video",
        runs,
        summary,
      };
      const reportPath = testInfo.outputPath(
        `table-${implementation}-${cpu}x.json`,
      );
      await writeFile(reportPath, JSON.stringify(report, null, 2));
      await testInfo.attach(`table-${implementation}-${cpu}x.json`, {
        path: reportPath,
        contentType: "application/json",
      });
      console.log(
        [
          `\nRESULTS — ${componentName} · ${cpuLabel}`,
          `  Typical table update: ${formatDuration(summary.updateMs.median)}`,
          `  Fastest: ${formatDuration(summary.updateMs.min)} · Slowest: ${formatDuration(summary.updateMs.max)}`,
          "",
          formatSummaryRow("Measurement", ["Median", "Minimum", "Maximum"]),
          `  ${"─".repeat(69)}`,
          ...summaryMetrics.map(([metric, label]) => {
            const { median, min, max } = summary[metric];
            return formatSummaryRow(
              label,
              [median, min, max].map(formatDuration),
            );
          }),
          "",
          `  Mounted rows: ${formatCountRange(runs.map((r) => r.mountedRows))}`,
          `  Page HTML elements: ${formatCountRange(runs.map((r) => r.domElements))}`,
          `  All 5 runs and their checks took ${formatDuration(elapsedMs)}.`,
          "",
          "  Median = middle of 5 runs. Durations overlap; do not add them.",
          "  Update ends at a paint opportunity, not guaranteed finished painting.",
          "  Passing means the test worked; it does not mean the table is fast.",
          `  Full-precision JSON saved to: ${reportPath}\n`,
        ].join("\n"),
      );
      comparisons.push({
        implementation,
        medianUpdateMs: summary.updateMs.median,
        medianLongestTaskMs: summary.longestTaskMs.median,
        mountedRows: runs[0].mountedRows,
        domElements: [...runs.map((run) => run.domElements)].sort(
          (a, b) => a - b,
        )[2],
      });
    }
    const [regular, optimized] = comparisons;
    const percentLessTime =
      (1 - optimized.medianUpdateMs / regular.medianUpdateMs) * 100;
    const speedup = regular.medianUpdateMs / optimized.medianUpdateMs;
    const comparisonPath = testInfo.outputPath(`table-comparison-${cpu}x.json`);
    await writeFile(
      comparisonPath,
      JSON.stringify({ cpu, comparisons, percentLessTime, speedup }, null, 2),
    );
    await testInfo.attach(`table-comparison-${cpu}x.json`, {
      path: comparisonPath,
      contentType: "application/json",
    });
    console.log(
      [
        `\nBEFORE / AFTER — ${cpuLabel}`,
        "  Regular = PeopleTable · Optimized = OptimizedPeopleTable",
        "",
        formatSummaryRow("Measurement", ["Regular", "Optimized"]),
        `  ${"─".repeat(57)}`,
        formatSummaryRow(
          "Typical table update",
          [regular.medianUpdateMs, optimized.medianUpdateMs].map(
            formatDuration,
          ),
        ),
        formatSummaryRow(
          "Longest blocking task (median)",
          [regular.medianLongestTaskMs, optimized.medianLongestTaskMs].map(
            formatDuration,
          ),
        ),
        formatSummaryRow(
          "Mounted rows at start",
          [regular.mountedRows, optimized.mountedRows].map((n) =>
            n.toLocaleString("en-US"),
          ),
        ),
        formatSummaryRow(
          "Page HTML elements (median)",
          [regular.domElements, optimized.domElements].map((n) =>
            n.toLocaleString("en-US"),
          ),
        ),
        "",
        `  Update time reduced by ${percentLessTime.toFixed(1)}% (${speedup.toFixed(1)}x speedup).`,
        `  Same data, CPU setting and timing checkpoints · 5 runs per component.`,
        `  Comparison JSON saved to: ${comparisonPath}\n`,
      ].join("\n"),
    );
  });
}
