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
      const params = new URL(route.request().url()).searchParams;
      await route.fulfill({
        json:
          endpoint === "heatmap"
            ? buildHeatmap(peopleFixture, params)
            : buildPeoplePage(peopleFixture, params),
      });
    });
  }
});

test("world map renders, keeps its canvas, and country selection respects filters and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/heatmap?")) requests++;
  });
  await page.goto("/heatmap");
  const chart = page.getByTestId("world-map-chart");
  await expect(chart.locator("canvas").first()).toBeVisible();
  const canvas = await chart.locator("canvas").first().elementHandle();
  const count = requests;
  await page.getByRole("button", { name: "Average age", exact: true }).click();
  await expect(chart).toHaveAttribute("aria-label", /average age/);
  expect(await canvas!.evaluate((el) => el.isConnected)).toBe(true);
  expect(requests).toBe(count);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore Canada", exact: true })
    .focus();
  await page
    .getByRole("button", { name: "Explore Canada", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("region", { name: "Selected country", exact: true }),
  ).toContainText("12 people");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(12);
  await expect(page).not.toHaveURL(/ageMin=/);
  expect(requests).toBe(count);
  await page.getByRole("combobox", { name: "Age group", exact: true }).click();
  await page.getByRole("option", { name: "18–24 years", exact: true }).click();
  await expect(page).not.toHaveURL(/country=Canada/);
  await expect(
    page.getByRole("region", { name: "Heatmap summary" }),
  ).toContainText("8");
  await page
    .getByRole("button", { name: "Explore Canada", exact: true })
    .click();
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(1);
  await expect(
    page.getByTestId("people-table").locator("tbody tr td").nth(4),
  ).toHaveText("21");
  await page.reload();
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Age heatmap", exact: true }).click();
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/country=Canada/);
  await page.goBack();
  await expect(
    page.getByRole("region", { name: "Selected country", exact: true }),
  ).toContainText("Canada");
  expect(errors).toEqual([]);
});

test("map asset failure keeps the country table usable and supports retry", async ({
  page,
}) => {
  await page.route("**/maps/world.json", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/heatmap");
  await expect(
    page.getByRole("button", { name: "Retry map", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("world-country-table").locator("tbody tr"),
  ).toHaveCount(5);
  await page.unroute("**/maps/world.json");
  await page.getByRole("button", { name: "Retry map", exact: true }).click();
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("world map fits desktop and mobile and is lazy-loaded from the age view", async ({
  page,
}) => {
  let mapRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/maps/world.json")) mapRequests++;
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/heatmap?view=age");
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
  expect(mapRequests).toBe(0);
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
  expect(mapRequests).toBe(1);
  await page.screenshot({
    path: "/tmp/peoplescope-world-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
  await page.screenshot({
    path: "/tmp/peoplescope-world-mobile.png",
    fullPage: true,
  });
});

test("clicking a country on the canvas opens the matching people", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/heatmap");
  const chart = page.getByTestId("world-map-chart");
  await expect(chart.locator("canvas").first()).toBeVisible();
  const box = await chart.boundingBox();
  // Canada at approximately 100°W, 55°N on the fitted equirectangular map.
  await chart.click({
    position: {
      x: box!.width * (0.02 + (80 / 360) * 0.96),
      y: box!.height * 0.2 + (28.65 * box!.width * 0.96) / 360,
    },
  });
  await expect(
    page.getByRole("region", { name: "Selected country", exact: true }),
  ).toContainText("Canada");
  await expect(
    page.getByTestId("people-table").locator("tbody tr"),
  ).toHaveCount(12);
});
