import { describe, expect, it } from "vitest";
import type { PeopleSnapshot } from "@/modules/people";
import { buildPeopleReport } from "@/modules/reports/server";
import { buildCountryComparison } from "@/modules/comparison/server";
import { buildHeatmap } from "@/modules/heatmap/server";
import { fixturePerson, peopleFixture } from "./fixtures/people";

const boundaryAges = [
  0, 17, 18, 24, 25, 34, 35, 44, 45, 54, 55, 64, 65, 74, 75, 120,
];
const snapshot: PeopleSnapshot = {
  meta: peopleFixture.meta,
  people: [...boundaryAges, 75].map((age, index) =>
    fixturePerson(index, {
      location: {
        country: index < 16 ? "Canada" : "Germany",
        city: "Test",
        state: "Test",
      },
      dob: { date: "2000-01-01T00:00:00.000Z", age },
    }),
  ),
};
const keys = [
  "0-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65-74",
  "75+",
];
const params = (value = "") => new URLSearchParams(value);

describe("age band contracts across aggregates", () => {
  it("includes each boundary once in report age and gender totals", () => {
    const report = buildPeopleReport(snapshot, params());
    expect(report.metrics.totalPeople).toBe(17);
    expect(report.ages.map((row) => row.key)).toEqual(keys);
    expect(report.ages.map((row) => [row.total, row.female, row.male])).toEqual(
      [
        [2, 1, 1],
        [2, 1, 1],
        [2, 1, 1],
        [2, 1, 1],
        [2, 1, 1],
        [2, 1, 1],
        [2, 1, 1],
        [3, 2, 1],
      ],
    );
    expect(report.ages[0]).toMatchObject({ min: 0, max: 17, label: "0–17" });
    expect(report.ages[7]).toMatchObject({ min: 75, max: 120, label: "75+" });
  });

  it("keeps comparison wire fields and country-specific percentages at the boundaries", () => {
    const comparison = buildCountryComparison(snapshot, params());
    expect(
      comparison.groups.map((group) => [group.country, group.total]),
    ).toEqual([
      ["Canada", 16],
      ["Germany", 1],
    ]);
    const [canada, germany] = comparison.groups;
    expect(canada.ages.map((row) => row.key)).toEqual(keys);
    expect(canada.ages.map((row) => row.count)).toEqual([
      2, 2, 2, 2, 2, 2, 2, 2,
    ]);
    expect(canada.ages.map((row) => row.percentage)).toEqual([
      12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5,
    ]);
    expect(germany.ages[7]).toEqual({
      key: "75+",
      label: "75+",
      count: 1,
      percentage: 100,
    });
    expect(
      germany.ages
        .slice(0, 7)
        .every((row) => row.count === 0 && row.percentage === 0),
    ).toBe(true);
  });

  it("keeps heatmap age groups separate from URL band values", () => {
    const heatmap = buildHeatmap(snapshot, params());
    expect(heatmap.totalPeople).toBe(17);
    expect(heatmap.ageGroups.map((group) => group.key)).toEqual(keys);
    expect(heatmap.ageGroups[0]).toEqual({
      key: "0-17",
      label: "0–17",
      min: 0,
      max: 17,
    });
    expect(heatmap.ageGroups[7]).toEqual({
      key: "75+",
      label: "75+",
      min: 75,
      max: 120,
    });
    expect(heatmap.rows[0].cells.map((cell) => cell.count)).toEqual([
      2, 2, 2, 2, 2, 2, 2, 2,
    ]);
    expect(heatmap.rows[0].cells.map((cell) => cell.percentage)).toEqual([
      12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5,
    ]);

    const filtered = buildHeatmap(snapshot, params("band=75-120"));
    expect(filtered.totalPeople).toBe(3);
    expect(filtered.filters).toEqual({
      gender: "all",
      ageMin: "75",
      ageMax: "120",
    });
    expect(
      filtered.rows.map((row) => [row.country, row.total, row.averageAge]),
    ).toEqual([
      ["Canada", 2, 97.5],
      ["Germany", 1, 75],
    ]);
    expect(filtered.rows[0].cells[7]).toEqual({ count: 2, percentage: 100 });
    expect(filtered.rows[1].cells[7]).toEqual({ count: 1, percentage: 100 });
    expect(
      filtered.rows.every((row) =>
        row.cells.slice(0, 7).every((cell) => cell.count === 0),
      ),
    ).toBe(true);
    expect(() => buildHeatmap(snapshot, params("band=75%2B"))).toThrow(
      "Choose a valid age group.",
    );
  });

  it("keeps request counts and earlier results independent", () => {
    const report = buildPeopleReport(snapshot, params());
    const comparison = buildCountryComparison(snapshot, params());
    const heatmap = buildHeatmap(snapshot, params());
    buildPeopleReport(snapshot, params("ageMin=75"));
    buildCountryComparison(
      snapshot,
      params("countryA=Germany&countryB=Canada"),
    );
    buildHeatmap(snapshot, params("band=75-120"));
    expect(buildPeopleReport(snapshot, params())).toEqual(report);
    expect(buildCountryComparison(snapshot, params())).toEqual(comparison);
    expect(buildHeatmap(snapshot, params())).toEqual(heatmap);
    expect(report.ages[7].total).toBe(3);
    expect(comparison.groups[0].ages[7].count).toBe(2);
    expect(heatmap.rows[0].cells[7].count).toBe(2);
  });
});
