import { test, expect } from "@playwright/test";
import { buildHeatmap } from "@/modules/heatmap/server";
import { buildPeoplePage } from "@/modules/people/server";
import { peopleFixture } from "../tests/fixtures/people";

test.beforeEach(async ({ page }) => {
  await page.route("https://randomuser.me/api/portraits/**", (route) =>
    route.abort(),
  );
  for (const endpoint of ["heatmap", "people"]) {
    await page.route(`**/api/${endpoint}?**`, async (route) => {
      try {
        const params = new URL(route.request().url()).searchParams;
        await route.fulfill({
          json:
            endpoint === "heatmap"
              ? buildHeatmap(peopleFixture, params)
              : buildPeoplePage(peopleFixture, params),
        });
      } catch (error) {
        await route.fulfill({
          status: 400,
          json: { error: (error as Error).message },
        });
      }
    });
  }
});

test("heatmap modes preserve the canvas and real cell clicks drill into matching people", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/heatmap?")) requests++;
  });
  await page.goto("/heatmap?view=age");
  await expect(
    page.getByRole("heading", { name: "Heatmap", exact: true }),
  ).toBeVisible();
  const chart = page.getByTestId("heatmap-chart");
  await expect(chart.locator("canvas").first()).toBeVisible();
  const canvas = await chart.locator("canvas").first().elementHandle();
  const count = requests;
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page).toHaveURL(/metric=count/);
  await expect(chart).toHaveAttribute("aria-label", /people counts/);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.goBack();
  await expect(chart).toHaveAttribute("aria-label", /percentages/);
  expect(requests).toBe(count);
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  await chart.click({
    position: {
      x: 144 + (box!.width - 168) / 16,
      y: 38 + (box!.height - 114) / 10,
    },
  });
  await expect(page).toHaveURL(/country=Canada/);
  await expect(page).toHaveURL(/ageMin=0&ageMax=17/);
  await expect(
    page.getByRole("region", { name: "Selected heatmap group" }),
  ).toContainText("Canada · 0–17 years");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(2);
  for (const row of await page
    .getByTestId("people-table")
    .locator("tbody tr")
    .all()) {
    await expect(row.locator("td").nth(2)).toContainText("Canada");
    await expect(row.locator("td").nth(4)).toHaveText("16");
  }
  expect(requests).toBe(count);
  // Reload should preserve the user's position, not jump to the explorer.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.reload();
  await expect(page.getByTestId("people-table")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(150);
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(page).not.toHaveURL(/country=Canada/);
  expect(errors).toEqual([]);
});

test("data table supports keyboard selection, filter changes, ordering and empty results", async ({
  page,
}) => {
  await page.goto("/heatmap?display=table");
  const table = page.getByTestId("heatmap-table");
  await expect(table.locator("tbody tr")).toHaveCount(5);
  const cell = page.getByRole("button", { name: /^Canada, age 0–17:/ });
  await cell.focus();
  await cell.press("Enter");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(2);
  await page.getByRole("combobox", { name: "Continent", exact: true }).click();
  await page.getByRole("option", { name: "Europe", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(page).not.toHaveURL(/country=Canada/);
  await expect(
    page.getByRole("button", { name: "Explore people", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Gender", exact: true }).click();
  await page.getByRole("option", { name: "Female", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Heatmap summary" }),
  ).toContainText("18");
  await page.getByRole("combobox", { name: "Order countries" }).click();
  await page.getByRole("option", { name: "Highest share aged 65+" }).click();
  await expect(page).toHaveURL(/order=older/);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Order countries" }),
  ).toContainText("Highest share aged 65+");
  await page.getByRole("combobox", { name: "Continent", exact: true }).click();
  await page.getByRole("option", { name: "Asia", exact: true }).click();
  await expect(
    page.getByText("No people for these filters", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset heatmap" }).click();
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("heatmap loading and error retry are visible", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/heatmap?**", async (route) => {
    await gate;
    await route.fulfill({
      status: 502,
      json: { error: "Provider unavailable" },
    });
  });
  await page.goto("/heatmap?view=age");
  await expect(page.getByTestId("heatmap-skeleton")).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: "Retry heatmap" }),
  ).toBeVisible();
  await page.route("**/api/heatmap?**", (route) =>
    route.fulfill({ json: buildHeatmap(peopleFixture, new URLSearchParams()) }),
  );
  await page.getByRole("button", { name: "Retry heatmap" }).click();
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("heatmap stays inside the mobile viewport with a working horizontal scroll area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/heatmap?view=age");
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
  await expect(page.getByRole("contentinfo")).toContainText(
    "Fictional profiles",
  );
  await expect(
    page.getByRole("link", { name: "Random User documentation" }),
  ).toHaveCount(1);
  await expect(page.getByRole("main")).not.toContainText("Random User");
  const scroll = page.getByTestId("heatmap-scroll-area");
  const viewport = scroll.locator('[data-slot="scroll-area-viewport"]');
  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  expect(
    await viewport.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(100);
  await expect(
    scroll.locator('[data-slot="scroll-area-thumb"]').last(),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/peoplescope-heatmap-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await viewport.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page.screenshot({
    path: "/tmp/peoplescope-heatmap-desktop.png",
    fullPage: true,
  });
});

test("invalid heatmap filters and unavailable selected groups can be reset", async ({
  page,
}) => {
  await page.goto("/heatmap?gender=invalid");
  await expect(
    page.getByText("Choose all, male, or female for gender.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset heatmap", exact: true })
    .click();
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
  await page.goto("/heatmap?country=Missing&ageMin=0&ageMax=17&explore=1");
  await expect(
    page.getByText(
      "This selected group is not available with the current filters.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByTestId("people-table")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore people", exact: true }),
  ).toBeVisible();
});
