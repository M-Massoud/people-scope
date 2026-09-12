import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { peopleFixture } from "../tests/fixtures/people";
import { buildPeopleReport } from "@/modules/reports/server";
import { buildPeoplePage } from "@/modules/people/server";

// Resolve emitted files instead of pinning webpack's content-hashed chunk names.
function tableChunks(module: string) {
  const manifest = JSON.parse(
    readFileSync(".next/react-loadable-manifest.json", "utf8"),
  ) as Record<string, { files: string[] }>;
  const entry = Object.entries(manifest).find(([key]) =>
    key.endsWith(`-> ./${module}`),
  );
  expect(entry, `${module} must have a separate lazy bundle`).toBeDefined();
  return entry![1].files.map((file) => `/_next/${file}`);
}

for (const mode of ["optimized", "regular"] as const) {
  test(`${mode} table code waits for nonempty results and shows a skeleton while loading`, async ({
    page,
  }) => {
    const chunks = tableChunks(
      mode === "optimized" ? "optimized-people-table" : "people-table",
    );
    const otherChunks = tableChunks(
      mode === "optimized" ? "people-table" : "optimized-people-table",
    ).filter((chunk) => !chunks.includes(chunk));
    const requestedOtherChunks: string[] = [];
    page.on("request", (request) => {
      if (otherChunks.includes(new URL(request.url()).pathname)) {
        requestedOtherChunks.push(request.url());
      }
    });
    if (mode === "regular") {
      await page.addInitScript(() => {
        Object.assign(window, { __PEOPLE_TABLE_BENCHMARK__: "regular" });
      });
    }
    await page.route("https://randomuser.me/api/portraits/**", (route) =>
      route.abort(),
    );
    await page.route("**/api/reports?**", (route) =>
      route.fulfill({
        json: buildPeopleReport(peopleFixture, new URLSearchParams()),
      }),
    );
    await page.route("**/api/people?**", (route) =>
      route.fulfill({
        json: buildPeoplePage(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      }),
    );

    const requestedChunks: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/_next/static/chunks/**", async (route) => {
      if (chunks.includes(new URL(route.request().url()).pathname)) {
        requestedChunks.push(route.request().url());
        await gate;
      }
      await route.continue();
    });

    try {
      await page.goto("/profile-timeline?search=no-such-person");
      await expect(
        page.getByRole("button", { name: "Explore people" }),
      ).toBeVisible();
      expect(requestedChunks).toHaveLength(0);
      await page.getByRole("button", { name: "Explore people" }).click();
      await expect(page.getByTestId("people-empty-state")).toBeVisible();
      expect(requestedChunks).toHaveLength(0);

      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click();
      await expect.poll(() => requestedChunks.length).toBeGreaterThan(0);
      const loading = page.getByRole("status", {
        name: "Loading people",
        exact: true,
      });
      await expect(loading).toBeVisible();
      await expect(page.getByTestId("people-table")).toHaveCount(0);
      await expect(
        page.getByLabel("Search people", { exact: true }),
      ).toBeFocused();
      await page
        .locator("#people-explorer")
        .screenshot({ path: `/tmp/people-lazy-${mode}-desktop.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator("#people-explorer")
        .screenshot({ path: `/tmp/people-lazy-${mode}-mobile.png` });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);

      release();
      await expect(
        page.getByTestId("people-table").locator("tbody tr"),
      ).toHaveCount(25);
      await expect(loading).toHaveCount(0);
      expect(requestedOtherChunks).toHaveLength(0);
      await expect(
        page.getByLabel("Search people", { exact: true }),
      ).toBeFocused();
    } finally {
      release();
    }
  });
}
