import { expect, test, type Page } from "@playwright/test";
import { buildCountryComparison } from "@/modules/comparison/server";
import { buildHeatmap } from "@/modules/heatmap/server";
import { buildPeopleReport } from "@/modules/reports/server";
import { peopleFixture } from "../tests/fixtures/people";

const views = [
  {
    path: "/profile-timeline?gender=female#chart",
    endpoint: "reports",
    build: buildPeopleReport,
    mode: "Monthly",
    selected: "Yearly",
    key: "grouping",
    value: "month",
    retry: "Try again",
    content: "report-chart",
  },
  {
    path: "/compare-countries",
    endpoint: "comparison",
    build: buildCountryComparison,
    mode: "Bar",
    selected: "Radar",
    key: "view",
    value: "bar",
    retry: "Try again",
    content: "comparison-chart",
  },
  {
    path: "/heatmap?view=age&gender=female#chart",
    endpoint: "heatmap",
    build: buildHeatmap,
    mode: "People",
    selected: "Share %",
    key: "metric",
    value: "count",
    retry: "Retry heatmap",
    content: "heatmap-chart",
  },
];

test.beforeEach(async ({ page }) => {
  for (const view of views) {
    await page.route(`**/api/${view.endpoint}?**`, (route) =>
      route.fulfill({
        json: view.build(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      }),
    );
  }
});

async function clipboard(page: Page, mode: "success" | "failure" | "pending") {
  await page.addInitScript((mode) => {
    const state = window as typeof window & {
      copyMode: "success" | "failure" | "pending";
      copiedUrl?: string;
      finishCopy?: () => void;
    };
    state.copyMode = mode;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (url: string) => {
          state.copiedUrl = url;
          if (state.copyMode === "failure")
            return Promise.reject(new Error("Permission denied"));
          if (state.copyMode === "pending")
            return new Promise<void>((resolve) => {
              state.finishCopy = resolve;
            });
          return Promise.resolve();
        },
      },
    });
  }, mode);
}

for (const view of views) {
  test(`${view.endpoint} copies its current view and clears feedback after changing modes`, async ({
    page,
  }) => {
    await clipboard(page, "success");
    await page.goto(view.path);
    await page.getByRole("button", { name: "Copy view link" }).click();
    const copied = await page.evaluate(
      () => (window as typeof window & { copiedUrl: string }).copiedUrl,
    );
    const expected = new URL(page.url());
    if (view.endpoint === "comparison") {
      expected.search = new URLSearchParams({
        countryA: "Canada",
        countryB: "Germany",
        view: "radar",
      }).toString();
    }
    expect(copied).toBe(expected.toString());
    await expect(
      page.getByRole("status").filter({ hasText: "Link copied" }),
    ).toBeVisible();
    await page.getByRole("button", { name: view.mode, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${view.key}=${view.value}`));
    await expect(page.getByText("Link copied", { exact: true })).toHaveCount(0);
    await page.goBack();
    await expect(page.getByText("Link copied", { exact: true })).toHaveCount(0);
  });

  test(`${view.endpoint} handles clipboard denial and ignores a copy finishing for an old view`, async ({
    page,
  }) => {
    await clipboard(page, "failure");
    await page.goto(view.path);
    await page.getByRole("button", { name: "Copy view link" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Copy the browser address" }),
    ).toBeVisible();
    await page.getByRole("button", { name: view.mode, exact: true }).click();
    await expect(
      page.getByText("Copy the browser address to share this view.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await page.goBack();
    await page.evaluate(() => {
      (window as typeof window & { copyMode: string }).copyMode = "pending";
    });
    await page.getByRole("button", { name: "Copy view link" }).click();
    await page.getByRole("button", { name: view.mode, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${view.key}=${view.value}`));
    await page.evaluate(() =>
      (window as typeof window & { finishCopy: () => void }).finishCopy(),
    );
    await expect(page.getByText("Link copied", { exact: true })).toHaveCount(0);
  });

  test(`${view.endpoint} keeps a selected mode and supports keyboard changes without dropping filters`, async ({
    page,
  }) => {
    await page.goto(view.path);
    const selected = page.getByRole("button", {
      name: view.selected,
      exact: true,
    });
    await selected.click();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    const before = new URL(page.url());
    await selected.press(
      view.endpoint === "comparison" ? "ArrowLeft" : "ArrowRight",
    );
    const next = page.getByRole("button", { name: view.mode, exact: true });
    await expect(next).toBeFocused();
    await next.press("Space");
    await expect(next).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toHaveAttribute("aria-pressed", "false");
    const after = new URL(page.url());
    expect(after.searchParams.get(view.key)).toBe(view.value);
    expect(after.searchParams.get("gender")).toBe(
      before.searchParams.get("gender"),
    );
    expect(after.hash).toBe(before.hash);
  });

  test(`${view.endpoint} keeps retry feedback visible until a delayed request succeeds`, async ({
    page,
  }) => {
    await page.route(`**/api/${view.endpoint}?**`, (route) =>
      route.fulfill({ status: 502, json: { error: "Provider unavailable" } }),
    );
    await page.goto(view.path);
    await expect(
      page.getByRole("button", { name: view.retry, exact: true }),
    ).toBeVisible();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/${view.endpoint}?**`, async (route) => {
      await gate;
      await route.fulfill({
        json: view.build(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      });
    });
    try {
      await page.getByRole("button", { name: view.retry, exact: true }).click();
      const retrying = page.getByRole("button", {
        name: "Retrying…",
        exact: true,
      });
      await expect(retrying).toBeDisabled();
      await expect(
        page.getByRole("status").filter({ hasText: "Retrying…" }),
      ).toBeVisible();
      await expect(
        page.getByText("Provider unavailable", { exact: true }),
      ).toBeVisible();
    } finally {
      release();
    }
    await expect(
      page.getByTestId(view.content).locator("canvas").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retrying…", exact: true }),
    ).toHaveCount(0);

    // Reconnecting after the freshness window refetches the same successful query.
    // Its earlier error must not return while those cached results are updating.
    await page.clock.install();
    await page.context().setOffline(true);
    await page.clock.fastForward(61_000);
    let finishBackground!: () => void;
    const backgroundGate = new Promise<void>((resolve) => {
      finishBackground = resolve;
    });
    let backgroundRequests = 0;
    await page.route(`**/api/${view.endpoint}?**`, async (route) => {
      backgroundRequests++;
      await backgroundGate;
      await route.fulfill({
        json: view.build(
          peopleFixture,
          new URL(route.request().url()).searchParams,
        ),
      });
    });
    try {
      await page.context().setOffline(false);
      await expect.poll(() => backgroundRequests).toBe(1);
      await expect(
        page.getByRole("status").filter({ hasText: "Updating" }),
      ).toBeVisible();
      await expect(
        page.getByText("Provider unavailable", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Retrying…", exact: true }),
      ).toHaveCount(0);
    } finally {
      finishBackground();
    }
    await expect(
      page.getByRole("status").filter({ hasText: "Updating" }),
    ).toHaveCount(0);
  });
}

test("changing filters during a heatmap retry drops the old error", async ({
  page,
}) => {
  await page.route("**/api/heatmap?**", (route) =>
    route.fulfill({ status: 502, json: { error: "Provider unavailable" } }),
  );
  await page.goto("/heatmap?view=age");
  await expect(
    page.getByRole("button", { name: "Retry heatmap" }),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/heatmap?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (!params.has("gender")) await gate;
    await route.fulfill({ json: buildHeatmap(peopleFixture, params) });
  });
  try {
    await page.getByRole("button", { name: "Retry heatmap" }).click();
    await expect(
      page.getByRole("button", { name: "Retrying…" }),
    ).toBeDisabled();
    await page.getByRole("combobox", { name: "Gender", exact: true }).click();
    await page.getByRole("option", { name: "Female", exact: true }).click();
    await expect(page).toHaveURL(/gender=female/);
    await expect(
      page.getByTestId("heatmap-chart").locator("canvas").first(),
    ).toBeVisible();
    await expect(
      page.getByText("Provider unavailable", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retrying…" })).toHaveCount(
      0,
    );
  } finally {
    release();
  }
});

test("map retry keeps country exploration available while boundaries load", async ({
  page,
}) => {
  await page.route("**/maps/world.json", (route) =>
    route.fulfill({ status: 502, body: "Unavailable" }),
  );
  await page.goto("/heatmap");
  await expect(page.getByRole("button", { name: "Retry map" })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/maps/world.json", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Retry map" }).click();
    await expect(
      page.getByRole("button", { name: "Retrying…" }),
    ).toBeDisabled();
    await expect(page.getByTestId("world-country-table")).toBeVisible();
    await expect(
      page.getByText(/where you can still explore people/),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("revisiting a failed map shows loading boundaries until the new request resolves", async ({
  page,
}) => {
  await page.route("**/maps/world.json", (route) =>
    route.fulfill({ status: 502, body: "Unavailable" }),
  );
  await page.goto("/heatmap");
  await expect(page.getByRole("button", { name: "Retry map" })).toBeVisible();
  await page.getByRole("button", { name: "Age heatmap", exact: true }).click();
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/maps/world.json", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "World map", exact: true }).click();
    await expect(page.getByLabel("Loading world boundaries")).toBeVisible();
    await expect(page.getByTestId("world-country-table")).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("revisiting failed heatmap filters shows loading instead of a blank result", async ({
  page,
}) => {
  let fail = true;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/heatmap?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (!params.has("gender")) {
      if (fail) {
        await route.fulfill({
          status: 502,
          json: { error: "Provider unavailable" },
        });
        return;
      }
      await gate;
    }
    await route.fulfill({ json: buildHeatmap(peopleFixture, params) });
  });
  await page.goto("/heatmap?view=age");
  await expect(
    page.getByRole("button", { name: "Retry heatmap" }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("combobox", { name: "Gender", exact: true }).click();
  await page.getByRole("option", { name: "Female", exact: true }).click();
  await expect(
    page.getByTestId("heatmap-chart").locator("canvas").first(),
  ).toBeVisible();
  // Leaving and re-entering the page drops placeholder data but keeps the failed
  // query in the browser cache, matching a freshly mounted error panel.
  await page
    .getByRole("link", { name: "Compare countries", exact: true })
    .click();
  await expect(
    page.getByTestId("comparison-chart").locator("canvas").first(),
  ).toBeVisible();
  try {
    await page.getByRole("link", { name: "Heatmap", exact: true }).click();
    await expect(page.getByTestId("heatmap-skeleton")).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByTestId("world-map-chart").locator("canvas").first(),
  ).toBeVisible();
});

test("retrying a failed report with cached figures announces only retry progress", async ({
  page,
}) => {
  await page.goto("/profile-timeline");
  await expect(
    page.getByTestId("report-chart").locator("canvas").first(),
  ).toBeVisible();
  await page.clock.install();
  await page.context().setOffline(true);
  await page.clock.fastForward(61_000);
  await page.route("**/api/reports?**", (route) =>
    route.fulfill({ status: 502, json: { error: "Provider unavailable" } }),
  );
  await page.context().setOffline(false);
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/reports?**", async (route) => {
    await gate;
    await route.fulfill({
      json: buildPeopleReport(
        peopleFixture,
        new URL(route.request().url()).searchParams,
      ),
    });
  });
  try {
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Retrying…", exact: true }),
    ).toBeDisabled();
    await expect(page.getByTestId("report-chart")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Retrying…" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("status").filter({ hasText: "Updating report" }),
    ).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page.getByText("Provider unavailable", { exact: true }),
  ).toHaveCount(0);
});
