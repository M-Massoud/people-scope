import { expect, test } from "@playwright/test";
import { PAGES } from "@/config";
import { buildPeopleReport } from "@/modules/reports/server";
import { buildCountryComparison } from "@/modules/comparison/server";
import { buildHeatmap } from "@/modules/heatmap/server";
import { peopleFixture } from "../tests/fixtures/people";

test("canonical paths, navigation, headings and titles use the same page names", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    const build =
      url.pathname === "/api/comparison"
        ? buildCountryComparison
        : url.pathname === "/api/heatmap"
          ? buildHeatmap
          : buildPeopleReport;
    return route.fulfill({ json: build(peopleFixture, url.searchParams) });
  });
  for (const definition of Object.values(PAGES)) {
    await page.goto(definition.href);
    await expect(page).toHaveTitle(`${definition.title} · PeopleScope`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: definition.title,
        exact: true,
      }),
    ).toBeVisible();
    const active = page
      .getByRole("navigation", { name: "Main navigation" })
      .locator('[aria-current="page"]');
    await expect(active).toHaveText(definition.title);
    await expect(active).toHaveAttribute("href", definition.href);
  }
});

test("old saved links redirect to canonical pages without losing filters", async ({
  request,
}) => {
  for (const [oldPath, newPath] of [
    ["/", "/profile-timeline"],
    ["/ages", "/age-groups"],
    ["/demographics", "/age-gender"],
    ["/countries", "/geography"],
    ["/comparison", "/compare-countries"],
  ]) {
    const response = await request.get(`${oldPath}?country=Canada&explore=1`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    const destination = new URL(
      response.headers().location,
      "http://127.0.0.1:3101",
    );
    expect(destination.pathname).toBe(newPath);
    expect(destination.searchParams.get("country")).toBe("Canada");
    expect(destination.searchParams.get("explore")).toBe("1");
  }
});
