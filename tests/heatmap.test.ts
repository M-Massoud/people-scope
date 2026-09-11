import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PeopleSnapshot } from "@/modules/people";
import { InvalidFiltersError } from "@/modules/people/server";
import { buildHeatmap, getHeatmap } from "@/modules/heatmap/server";
import { GET } from "../src/app/api/heatmap/route";
import {
  heatmapOption,
  heatmapScale,
  sortHeatmapRows,
} from "@/modules/heatmap/charts";
import { fixturePerson, peopleFixture } from "./fixtures/people";

const snapshot: PeopleSnapshot = {
  meta: peopleFixture.meta,
  people: [
    ["Canada", 18, "female"],
    ["Canada", 24, "male"],
    ["Canada", 25, "female"],
    ["Canada", 75, "male"],
    ["Germany", 75, "female"],
    ["Germany", 120, "male"],
    ["France", 17, "female"],
  ].map(([country, age, gender], index) =>
    fixturePerson(index, {
      location: { country: String(country), state: "Test", city: "Test" },
      dob: { date: "2000-01-01T00:00:00.000Z", age: Number(age) },
      gender: gender as "male" | "female",
    }),
  ),
};
const params = (value = "") => new URLSearchParams(value);
afterEach(() => vi.unstubAllGlobals());

describe("heatmap aggregation", () => {
  it("counts every person once and normalizes each country by its own total", () => {
    const data = buildHeatmap(snapshot, params());
    expect(data.totalPeople).toBe(7);
    expect(data.rows.map((row) => row.country)).toEqual([
      "Canada",
      "France",
      "Germany",
    ]);
    expect(data.ageGroups).toHaveLength(8);
    for (const row of data.rows) {
      expect(row.cells.reduce((sum, cell) => sum + cell.count, 0)).toBe(
        row.total,
      );
      expect(
        row.cells.reduce((sum, cell) => sum + cell.percentage, 0),
      ).toBeCloseTo(100);
    }
    expect(data.rows[0].cells[1]).toEqual({ count: 2, percentage: 50 });
    expect(data.rows[2].cells[7]).toEqual({ count: 2, percentage: 100 });
    expect(data.rows[0].cells[0]).toEqual({ count: 0, percentage: 0 });
  });
  it("includes age boundaries 17, 18, 24, 25, 75 and 120 in the correct bands", () => {
    const data = buildHeatmap(snapshot, params());
    expect(data.rows[0].cells.map((cell) => cell.count)).toEqual([
      0, 2, 1, 0, 0, 0, 0, 1,
    ]);
    expect(data.rows[1].cells[0].count).toBe(1);
    expect(data.rows[2].cells[7].count).toBe(2);
  });
  it("filters continents and genders before calculating denominators", () => {
    const data = buildHeatmap(
      snapshot,
      params("continent=Europe&gender=female"),
    );
    expect(data.totalPeople).toBe(2);
    expect(data.filters).toEqual({ continent: "Europe", gender: "female" });
    expect(data.rows.map((row) => row.country)).toEqual(["France", "Germany"]);
    expect(data.rows[1].cells[7]).toEqual({ count: 1, percentage: 100 });
  });
  it("keeps drilldown and display parameters out of the matrix aggregation", () => {
    expect(
      buildHeatmap(
        snapshot,
        params(
          "country=Canada&ageMin=18&ageMax=24&metric=count&order=size&search=A",
        ),
      ),
    ).toEqual(buildHeatmap(snapshot, params()));
  });
  it("returns an empty matrix for a valid filter without matches", () => {
    const data = buildHeatmap(snapshot, params("continent=Asia"));
    expect(data.rows).toEqual([]);
    expect(data.totalPeople).toBe(0);
    expect(data.ageGroups).toHaveLength(8);
  });
  it("rejects invalid filters before contacting the provider", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(getHeatmap(params("gender=invalid"))).rejects.toBeInstanceOf(
      InvalidFiltersError,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(() => buildHeatmap(snapshot, params("continent=Mars"))).toThrow(
      InvalidFiltersError,
    );
  });
  it("returns HTTP 400 for invalid filters and HTTP 502 for upstream failure", async () => {
    const bad = await GET(
      new NextRequest("http://localhost/api/heatmap?gender=invalid"),
    );
    expect(bad.status).toBe(400);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
    );
    const unavailable = await GET(
      new NextRequest("http://localhost/api/heatmap"),
    );
    expect(unavailable.status).toBe(502);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("heatmap presentation", () => {
  it("sorts by sample size or 65+ share without mutating the API rows", () => {
    const { rows } = buildHeatmap(snapshot, params());
    expect(sortHeatmapRows(rows, "size").map((row) => row.country)).toEqual([
      "Canada",
      "Germany",
      "France",
    ]);
    expect(sortHeatmapRows(rows, "older").map((row) => row.country)).toEqual([
      "Germany",
      "Canada",
      "France",
    ]);
    expect(rows.map((row) => row.country)).toEqual([
      "Canada",
      "France",
      "Germany",
    ]);
  });
  it("uses nonzero explicit color scales, including empty results", () => {
    const { rows } = buildHeatmap(snapshot, params());
    expect(heatmapScale(rows, "share")).toBe(100);
    expect(heatmapScale(rows, "count")).toBe(2);
    expect(heatmapScale([], "share")).toBe(10);
    expect(heatmapScale([], "count")).toBe(1);
  });
  it("maps color to the cell value instead of its country or age index", () => {
    const data = buildHeatmap(snapshot, params());
    const option = heatmapOption(data.rows, data.ageGroups, "share", {
      country: "Canada",
      ageKey: "18-24",
    });
    const series = Array.isArray(option.series)
      ? option.series[0]
      : option.series;
    expect(option.visualMap).toMatchObject({ dimension: 2, min: 0, max: 100 });
    expect(series).toMatchObject({ type: "heatmap" });
    const points = series!.data as {
      value: number[];
      itemStyle?: { borderWidth?: number };
    }[];
    expect(points).toHaveLength(24);
    expect(points[1].value).toEqual([1, 0, 50]);
    expect(points[1].itemStyle?.borderWidth).toBe(3);
    expect(points[23].value).toEqual([7, 2, 100]);
  });
});
