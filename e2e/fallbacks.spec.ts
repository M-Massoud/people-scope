import { expect, test } from "@playwright/test";
import { buildPeopleReport } from "@/modules/reports/server";
import { peopleFixture } from "../tests/fixtures/people";

test("invalid date filters show a clear recovery state and reset restores the report", async ({
  page,
}) => {
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
  await page.goto("/age-groups?from=2017-06-01&to=2022-05-aaaa");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load this report" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose valid calendar dates",
  );
  await page.screenshot({
    path: "/tmp/peoplescope-report-error-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "/tmp/peoplescope-report-error-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset to all data" }).click();
  await expect(page).toHaveURL(/\/age-groups$/);
  await expect(
    page.getByTestId("report-chart").locator("canvas"),
  ).toBeVisible();
});

test("unknown routes show a branded, responsive 404 with working navigation", async ({
  page,
}) => {
  await page.route("**/api/reports?**", (route) =>
    route.fulfill({
      json: buildPeopleReport(
        peopleFixture,
        new URL(route.request().url()).searchParams,
      ),
    }),
  );
  const response = await page.goto("/missing-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found · PeopleScope");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore the map" }),
  ).toHaveAttribute("href", "/heatmap");
  await page.screenshot({
    path: "/tmp/peoplescope-404-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("link", { name: "Back to dashboard" }),
  ).toBeInViewport();
  await page.screenshot({
    path: "/tmp/peoplescope-404-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(
    page.getByTestId("report-chart").locator("canvas"),
  ).toBeVisible();
});

test("a render error shows recovery actions and reload preserves the selected view", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/reports?**", (route) =>
    route.fulfill({
      // An invalid response forces a render exception, exercising Next's boundary.
      json: fail
        ? {}
        : buildPeopleReport(
            peopleFixture,
            new URL(route.request().url()).searchParams,
          ),
    }),
  );
  await page.goto("/age-groups?country=Canada");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load this page" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to dashboard" }),
  ).toHaveAttribute("href", "/profile-timeline");
  await expect(page.locator("main")).not.toContainText("TypeError");
  await page.screenshot({
    path: "/tmp/peoplescope-error-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("button", { name: "Reload page" }),
  ).toBeInViewport();
  await page.screenshot({
    path: "/tmp/peoplescope-error-mobile.png",
    fullPage: true,
  });

  fail = false;
  await page.getByRole("button", { name: "Reload page" }).click();
  await expect(
    page.getByTestId("report-chart").locator("canvas"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/age-groups\?country=Canada$/);
  await expect(
    page.getByRole("region", { name: "Report summary" }),
  ).toContainText("12");
});
