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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function mockNavigationData(
  page:
    import("@playwright/test").Page | import("@playwright/test").BrowserContext,
) {
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
}

test("a delayed route gives pending feedback without changing the link name or size", async ({
  page,
}) => {
  await mockNavigationData(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const destination = deferred();
  await page.route("**/geography?**", async (route) => {
    if (route.request().headers().rsc === "1") await destination.promise;
    await route.continue();
  });
  try {
    await page.goto("/profile-timeline");
    await expect(
      page.getByRole("button", { name: "Copy view link" }),
    ).toBeVisible();
    const link = page.getByRole("link", { name: "Geography", exact: true });
    const before = await link.boundingBox();
    await link.click();
    await expect(
      page.getByRole("status").filter({ hasText: "Opening Geography" }),
    ).toBeVisible();
    await expect(link).toHaveAccessibleName("Geography");
    expect((await link.boundingBox())?.width).toBe(before?.width);
    await expect(page.getByRole("main")).toHaveCount(1);
    destination.resolve();
    await expect(
      page.getByRole("heading", { level: 1, name: "Geography", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Opening Geography" }),
    ).toHaveCount(0);
  } finally {
    destination.resolve();
  }
});

test("destination content and navigation appear before its data resolves", async ({
  page,
}) => {
  await mockNavigationData(page);
  const response = deferred();
  await page.route("**/api/comparison?**", async (route) => {
    await response.promise;
    const url = new URL(route.request().url());
    await route.fulfill({
      json: buildCountryComparison(peopleFixture, url.searchParams),
    });
  });
  try {
    await page.goto("/profile-timeline");
    await page
      .getByRole("link", { name: "Compare countries", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Compare countries",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading comparison" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(1);
    await page.getByRole("link", { name: "Age groups", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Age groups", exact: true }),
    ).toBeVisible();
  } finally {
    response.resolve();
  }
});

test("report navigation preserves filters and Back while modifier clicks keep native links", async ({
  page,
  context,
}) => {
  await mockNavigationData(context);
  await page.goto("/profile-timeline?country=Canada&gender=female");
  const link = page.getByRole("link", { name: "Age groups", exact: true });
  await expect(link).toHaveAttribute(
    "href",
    "/age-groups?country=Canada&gender=female",
  );
  const newPage = context.waitForEvent("page");
  await link.click({ modifiers: ["ControlOrMeta"] });
  const opened = await newPage;
  await expect(opened).toHaveURL(/\/age-groups\?country=Canada&gender=female$/);
  await opened.close();
  await expect(page).toHaveURL(
    /\/profile-timeline\?country=Canada&gender=female$/,
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Opening Age groups" }),
  ).toHaveCount(0);
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Age groups", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/age-groups\?country=Canada&gender=female$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Profile timeline",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /\/profile-timeline\?country=Canada&gender=female$/,
  );
});

test("a delayed destination module shows its route loading screen before the page code arrives", async ({
  page,
}) => {
  await mockNavigationData(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const module = deferred();
  const requested = deferred();
  await page.route(
    "**/_next/static/chunks/app/compare-countries/page-*.js",
    async (route) => {
      requested.resolve();
      await module.promise;
      await route.continue();
    },
  );
  try {
    await page.goto("/profile-timeline?country=Canada");
    await expect(
      page.getByRole("button", { name: "Copy view link" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Compare countries", exact: true })
      .click();
    await requested.promise;
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Compare countries",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading page" }),
    ).toBeVisible();
    await expect(page.locator(".page-heading")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.locator(".summary-card").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(1);
    await page.getByRole("link", { name: "Age groups", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Age groups", exact: true }),
    ).toBeVisible();
    module.resolve();
  } finally {
    module.resolve();
  }
});
