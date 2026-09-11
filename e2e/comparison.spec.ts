import { test, expect } from "@playwright/test";
import { peopleFixture } from "../tests/fixtures/people";
import { buildCountryComparison } from "@/modules/comparison/server";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/comparison?**", async (route) => {
    try {
      await route.fulfill({
        json: buildCountryComparison(
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

test("country comparison switches charts, preserves selections and fits mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/comparison?")) requests++;
  });
  await page.goto("/comparison");
  await expect(
    page.getByRole("heading", { name: "Country comparison", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("comparison-chart").locator("canvas"),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "First country" }),
  ).toContainText("Canada");
  await expect(
    page.getByRole("combobox", { name: "Second country" }),
  ).toContainText("Germany");
  await expect(
    page.getByTestId("comparison-table").locator("tbody tr"),
  ).toHaveCount(8);
  const count = requests;
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await expect(page).toHaveURL(/view=bar/);
  await expect(page.getByTestId("comparison-chart")).toHaveAttribute(
    "aria-label",
    /Bar/,
  );
  expect(requests).toBe(count);
  await page.getByRole("combobox", { name: "First country" }).click();
  await expect(
    page.getByRole("option", { name: "Germany", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: "France", exact: true }).click();
  await expect(page).toHaveURL(/countryA=France/);
  await expect(
    page.getByTestId("comparison-table").locator("thead"),
  ).toContainText("France");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "First country" }),
  ).toContainText("France");
  await expect(page.getByTestId("comparison-chart")).toHaveAttribute(
    "aria-label",
    /Bar/,
  );
  await page.getByRole("button", { name: "Radar", exact: true }).click();
  await expect(page.getByTestId("comparison-chart")).toHaveAttribute(
    "aria-label",
    /Radar/,
  );
  await page.goBack();
  await expect(page.getByTestId("comparison-chart")).toHaveAttribute(
    "aria-label",
    /Bar/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Radar", exact: true }).click();
  await expect(
    page.getByTestId("comparison-chart").locator("canvas"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const heights = await page
    .locator('.report-grid > [data-slot="card"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights[0]).toBe(heights[1]);
  expect(errors).toEqual([]);
});

test("invalid comparison can reset and a pending request shows aligned skeletons", async ({
  page,
}) => {
  await page.goto("/comparison?countryA=Atlantis");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "available",
  );
  await page.getByRole("button", { name: "Reset comparison" }).click();
  await expect(
    page.getByTestId("comparison-chart").locator("canvas"),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/comparison?**", async (route) => {
    await gate;
    await route.fulfill({
      json: buildCountryComparison(peopleFixture, new URLSearchParams()),
    });
  });
  await page.reload();
  await expect(page.getByTestId("comparison-skeleton")).toBeVisible();
  const heights = await page
    .locator('.report-grid > [data-slot="card"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights).toEqual([480, 480]);
  release();
  await expect(
    page.getByTestId("comparison-chart").locator("canvas"),
  ).toBeVisible();
});
