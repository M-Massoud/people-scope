import { test, expect } from "@playwright/test";
import { fixturePerson, peopleFixture } from "../tests/fixtures/people";
import { buildPeopleReport } from "@/modules/reports/server";
import { buildPeoplePage } from "@/modules/people/server";

const snapshot = {
  ...peopleFixture,
  people: Array.from({ length: 5000 }, (_, index) => fixturePerson(index)),
};
const allPeople = buildPeoplePage(
  snapshot,
  new URLSearchParams("pageSize=5000"),
);

test.beforeEach(async ({ page }) => {
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
});

test("5,000 people stay accessible with bounded rows, keyboard navigation and profile focus", async ({
  page,
}) => {
  await page.goto("/profile-timeline?explore=1&pageSize=5000");
  const table = page.getByTestId("people-table");
  await expect(table).toBeVisible({ timeout: 30_000 });
  // This fails against the unoptimized table without relying on new attributes.
  expect(await table.locator("tbody tr").count()).toBeLessThan(80);
  await expect(table).toHaveAttribute("aria-rowcount", "5001");
  const rows = table.locator("[data-person-row]");
  const first = rows.first().getByRole("button");
  await first.focus();
  for (let i = 0; i < 35; i++) await page.keyboard.press("Tab");
  await expect(table.locator('[aria-rowindex="37"] button')).toBeFocused();
  await page.keyboard.press("End");
  const last = table.locator('[aria-rowindex="5001"]');
  await expect(last).toContainText(allPeople.items.at(-1)!.email);
  await expect(last.getByRole("button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    allPeople.items.at(-1)!.email,
  );
  await page.keyboard.press("Escape");
  await expect(last.getByRole("button")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("combobox", { name: "Rows per page" }),
  ).toBeFocused();
  await last.getByRole("button").focus();
  await page.keyboard.press("Home");
  await expect(table.locator('[aria-rowindex="2"] button')).toBeFocused();
  expect(await rows.count()).toBeLessThan(80);
});

test("virtual rows scroll on desktop and mobile and reset after sorting, search and page size changes", async ({
  page,
}) => {
  await page.goto("/profile-timeline?explore=1&pageSize=5000");
  const table = page.getByTestId("people-table");
  const viewport = page
    .getByTestId("people-scroll-area")
    .locator('[data-slot="scroll-area-viewport"]');
  await expect(table).toBeVisible({ timeout: 30_000 });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await viewport.scrollIntoViewIfNeeded();
    await viewport.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const last = table.locator('[aria-rowindex="5001"]');
    await expect(last).toContainText(allPeople.items.at(-1)!.email);
    await expect(last).toBeVisible();
    expect(await table.locator("[data-person-row]").count()).toBeLessThan(80);
    const head = (await table.locator("th").first().boundingBox())!;
    const area = (await viewport.boundingBox())!;
    expect(Math.abs(head.y - area.y)).toBeLessThan(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page
      .getByTestId("people-scroll-area")
      .screenshot({ path: `/tmp/people-virtualized-${width}.png` });
  }
  await page
    .getByRole("combobox", { name: "Sort people", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Youngest first", exact: true })
    .click();
  await expect(table.locator('[aria-rowindex="2"] td').nth(4)).toHaveText("16");
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBe(0);
  await page
    .getByRole("searchbox", { name: "Search people" })
    .fill("NO-SUCH-PERSON");
  await expect(page.getByTestId("people-empty-state")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(table).toBeVisible({ timeout: 30_000 });
  await page.getByRole("combobox", { name: "Rows per page" }).click();
  await page.getByRole("option", { name: "25", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(25);
});
