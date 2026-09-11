import { test, expect } from "@playwright/test";
import { peopleFixture } from "../tests/fixtures/people";
import {
  buildPeopleReport,
  buildPeoplePage,
} from "../src/server/people-service";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/reports?**", async (route) => {
    try {
      await route.fulfill({
        json: buildPeopleReport(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      });
    } catch (error) {
      await route.fulfill({
        status: 400,
        json: { error: (error as Error).message },
      });
    }
  });
  await page.route("**/api/people?**", async (route) => {
    try {
      await route.fulfill({
        json: buildPeoplePage(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      });
    } catch (error) {
      await route.fulfill({
        status: 400,
        json: { error: (error as Error).message },
      });
    }
  });
});

test("four reports render only API-based people data", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, title] of [
    ["/", "Registrations"],
    ["/ages", "Age groups"],
    ["/demographics", "Demographics"],
    ["/countries", "Geography"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("report-chart").locator("canvas"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Report summary" }),
    ).toContainText("60");
    await expect(page.getByTestId("report-table")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Campaign", exact: true }),
    ).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("country filters preserve the canvas, URL, navigation, refresh and Back", async ({
  page,
}) => {
  await page.goto("/");
  const chart = page.getByTestId("report-chart");
  await expect(chart.locator("canvas")).toBeVisible();
  const canvas = await chart.locator("canvas").elementHandle();
  await page.getByRole("combobox", { name: "Country", exact: true }).click();
  await page.getByRole("option", { name: "Canada", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/country=Canada/);
  await expect(
    page.getByRole("region", { name: "Report summary" }),
  ).toContainText("12");
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Country", exact: true }),
  ).toContainText("Canada");
  await page.getByRole("link", { name: "Geography", exact: true }).click();
  await expect(page).toHaveURL(/countries\?.*country=Canada/);
  await expect(page.getByTestId("report-table")).toContainText("100.0%");
  await page.getByRole("button", { name: "Remove country filter" }).click();
  await expect(page).not.toHaveURL(/country=Canada/);
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Country", exact: true }),
  ).toContainText("Canada");
});

test("age inputs validate and presets highlight the selected registration period", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "All time", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Minimum age", { exact: true }).fill("50");
  await page.getByLabel("Maximum age", { exact: true }).fill("20");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("Minimum age must not exceed maximum age."),
  ).toBeVisible();
  await page.getByLabel("Minimum age", { exact: true }).fill("20");
  await page.getByLabel("Maximum age", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/ageMin=20/);
  await page
    .getByRole("button", { name: "Latest 12 months", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Latest 12 months", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/from=2024-01-01/);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "All time", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("monthly registration rows drill into their real date boundaries", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(page).toHaveURL(/grouping=month/);
  await expect(
    page.getByTestId("report-table").locator("tbody tr"),
  ).toHaveCount(252);
  await page
    .getByTestId("report-table")
    .locator("tbody tr")
    .first()
    .getByRole("button")
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("from") === "2004-01-01" &&
      url.searchParams.get("to") === "2004-01-31" &&
      url.searchParams.get("explore") === "1",
  );
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(1);
});

test("people explorer searches, sorts, paginates and opens direct API details", async ({
  page,
}) => {
  await page.goto("/?explore=1");
  const table = page.getByTestId("people-table");
  await expect(table.locator("tbody tr")).toHaveCount(25);
  const summary = await page
    .getByRole("region", { name: "Report summary" })
    .innerText();
  const firstName = await table
    .locator("tbody tr")
    .first()
    .getByRole("button")
    .innerText();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    table.locator("tbody tr").first().getByRole("button"),
  ).not.toHaveText(firstName);
  const trigger = table.locator("tbody tr").first().getByRole("button");
  const name = await trigger.innerText();
  await trigger.click();
  await expect(page.getByRole("dialog")).toContainText(name);
  await expect(page.getByRole("dialog")).toContainText("Date of birth");
  await expect(page.getByRole("dialog")).not.toContainText("Budget");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page
    .getByRole("combobox", { name: "Sort people", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Youngest first", exact: true })
    .click();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(
    table.locator("tbody tr").first().locator("td").nth(4),
  ).toHaveText("16");
  await page
    .getByRole("searchbox", { name: "Search people" })
    .fill("NO-SUCH-PERSON");
  await expect(
    page.getByText("No matching people", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Report summary" })).toHaveText(
    summary,
    { useInnerText: true },
  );
  await page
    .getByRole("button", { name: "Clear search", exact: true })
    .first()
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(25);
});

test("country and demographic table actions drill into matching records", async ({
  page,
}) => {
  await page.goto("/countries");
  await page.getByRole("button", { name: "Countries", exact: true }).click();
  await page
    .getByRole("button", { name: "View people in Canada", exact: true })
    .click();
  await expect(page).toHaveURL(/country=Canada/);
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(12);
  await page.goto("/demographics?ageMin=20&ageMax=30");
  await page.getByRole("button", { name: /View male ages 18/ }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("ageMin") === "20" &&
      url.searchParams.get("ageMax") === "24" &&
      url.searchParams.get("gender") === "male",
  );
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(8);
});

test("clicking an actual grouped bar applies its gender and age cohort", async ({
  page,
}) => {
  await page.goto("/demographics");
  const canvas = page.getByTestId("report-chart").locator("canvas");
  await expect(canvas).toBeVisible();
  // Pick a painted green bar below the legend, accounting for device pixel ratio.
  const point = await canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext("2d")!;
    const y = Math.floor(element.height * 0.7);
    const pixels = context.getImageData(0, y, element.width, 1).data;
    for (let x = 0; x < element.width; x++)
      if (
        pixels[x * 4] === 117 &&
        pixels[x * 4 + 1] === 145 &&
        pixels[x * 4 + 2] === 125
      )
        return {
          x: ((x + 2) * element.clientWidth) / element.width,
          y: (y * element.clientHeight) / element.height,
        };
    throw Error("No female bar was painted");
  });
  await canvas.click({ position: point });
  await expect(page).toHaveURL(/gender=female/);
  await expect(page).toHaveURL(/explore=1/);
  const rows = page.getByTestId("people-table").locator("tbody tr");
  await expect(rows).toHaveCount(8);
  await expect(rows.first().locator("td").nth(3)).toHaveText("female");
});

test("loading skeleton and failed request recovery are visible", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/reports?**", async (route) => {
    requests++;
    if (requests <= 2) {
      await gate;
      await route.fulfill({
        status: 502,
        json: { error: "Could not load people. Please try again." },
      });
    } else
      await route.fulfill({
        json: buildPeopleReport(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      });
  });
  await page.goto("/");
  await expect(page.getByTestId("report-skeleton")).toBeVisible();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Could not load people",
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByTestId("report-chart").locator("canvas"),
  ).toBeVisible();
});

test("empty selections show no invented average or chart", async ({ page }) => {
  await page.goto("/ages?ageMin=110");
  await expect(page.getByText("No people for these filters.")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Report summary" }),
  ).toContainText("—");
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("calendar uses shadcn year selection and preserves focus and civil dates", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Registered from",
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole("combobox", { name: "Calendar year", exact: true })
    .click();
  await page.getByRole("option", { name: "2020", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Calendar year", exact: true }),
  ).toContainText("2020");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("all reports and the explorer fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/ages", "/demographics", "/countries?explore=1"]) {
    await page.goto(path);
    await expect(
      page.getByTestId("report-chart").locator("canvas"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByTestId("people-table")
    .locator("tbody tr")
    .first()
    .getByRole("button")
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("changing country preserves unfinished age edits until Apply", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Minimum age", { exact: true }).fill("30");
  await page.getByRole("combobox", { name: "Country", exact: true }).click();
  await page.getByRole("option", { name: "Canada", exact: true }).click();
  await expect(page.getByLabel("Minimum age", { exact: true })).toHaveValue(
    "30",
  );
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("country") === "Canada" &&
      url.searchParams.get("ageMin") === "30",
  );
});

test("an open explorer does not auto-scroll on page load or navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    (window as unknown as { explorerScrolls: number }).explorerScrolls = 0;
    Element.prototype.scrollIntoView = function (options) {
      if (this.id === "people-explorer") {
        (window as unknown as { explorerScrolls: number }).explorerScrolls++;
      }
      return original.call(this, options);
    };
  });
  await page.goto("/?explore=1");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(25);
  expect(
    await page.evaluate(
      () => (window as unknown as { explorerScrolls: number }).explorerScrolls,
    ),
  ).toBe(0);
  await page.getByRole("link", { name: "Age groups", exact: true }).click();
  await expect(page).toHaveURL(/ages\?explore=1/);
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(25);
  expect(
    await page.evaluate(
      () => (window as unknown as { explorerScrolls: number }).explorerScrolls,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Hide people", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore people", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { explorerScrolls: number }).explorerScrolls,
      ),
    )
    .toBe(1);
});

test("report cards align and shadcn scrollbars stay visible and work in both directions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?explore=1");
  await expect(
    page.getByTestId("report-chart").locator("canvas"),
  ).toBeVisible();
  const cards = page.locator('.report-grid > [data-slot="card"]');
  const heights = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(heights).toHaveLength(2);
  expect(Math.abs(heights[0] - heights[1])).toBeLessThan(1);
  const report = page.getByTestId("report-scroll-area");
  const vertical = report.locator(
    '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
  );
  await page.mouse.move(0, 0);
  await expect(vertical).toBeVisible();
  await expect(vertical).toHaveCSS("opacity", "1");
  const viewport = report.locator('[data-slot="scroll-area-viewport"]');
  await viewport.focus();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const people = page.getByTestId("people-scroll-area");
  await people.scrollIntoViewIfNeeded();
  const horizontal = people.locator(
    '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
  );
  await expect(horizontal).toBeVisible();
  const thumb = horizontal.locator('[data-slot="scroll-area-thumb"]');
  const box = (await thumb.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      people
        .locator('[data-slot="scroll-area-viewport"]')
        .evaluate((element) => element.scrollLeft),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("continent doughnut groups countries and drills into matching profiles", async ({
  page,
}) => {
  await page.goto("/countries");
  await expect(
    page.getByRole("heading", { name: "People by continent", exact: true }),
  ).toBeVisible();
  const table = page.getByTestId("report-table");
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(table.locator("tbody tr").first()).toContainText("Europe");
  await expect(table.locator("tbody tr").first()).toContainText("60.0%");
  await page
    .getByRole("button", { name: "View people in Europe", exact: true })
    .click();
  await expect(page).toHaveURL(/continent=Europe/);
  await expect(
    page.getByRole("region", { name: "Report summary" }),
  ).toContainText("36");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(25);
  await page.getByRole("button", { name: "Countries", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(table).not.toContainText("Canada");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove continent filter" }),
  ).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Remove continent filter" }).click();
  await expect(table.locator("tbody tr")).toHaveCount(5);
});
