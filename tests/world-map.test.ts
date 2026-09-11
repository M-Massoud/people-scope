import { describe, expect, it } from "vitest";
import { buildHeatmap } from "@/modules/heatmap/server";
import { worldMapOption } from "@/modules/heatmap/charts";
import { peopleFixture } from "./fixtures/people";

describe("world map data", () => {
  it("calculates exact average ages from profiles, not age-band midpoints", () => {
    const data = buildHeatmap(peopleFixture, new URLSearchParams());
    for (const row of data.rows) {
      const people = peopleFixture.people.filter(
        (p) => p.location.country === row.country,
      );
      expect(row.averageAge).toBe(
        people.reduce((sum, p) => sum + p.dob.age, 0) / people.length,
      );
    }
  });
  it("applies age bands before counts and averages and validates unknown bands", () => {
    const data = buildHeatmap(peopleFixture, new URLSearchParams("band=18-24"));
    expect(data.totalPeople).toBe(8);
    expect(data.rows.every((r) => r.averageAge === 21)).toBe(true);
    expect(data.filters).toMatchObject({ ageMin: "18", ageMax: "24" });
    expect(() =>
      buildHeatmap(peopleFixture, new URLSearchParams("band=bad")),
    ).toThrow();
  });
  it("joins countries by name and updates values and selected borders", () => {
    const data = buildHeatmap(peopleFixture, new URLSearchParams());
    const option = worldMapOption(data.rows, "count", "Canada");
    expect(option.series).toMatchObject({
      type: "map",
      map: "peoplescope-world",
      roam: true,
    });
    const series = option.series as {
      data: { name: string; value: number; itemStyle?: unknown }[];
    };
    expect(series.data.find((p) => p.name === "Canada")).toMatchObject({
      value: 12,
      itemStyle: { borderWidth: 2 },
    });
    expect(option.visualMap).toMatchObject({ min: 0, max: 12 });
    const age = worldMapOption(data.rows, "age");
    expect(age.series).toMatchObject({
      data: data.rows.map((r) => ({ name: r.country, value: r.averageAge })),
    });
  });
});

// The map must cover every country currently supported by the provider.
import { readFileSync } from "node:fs";
it("contains matching boundaries for the provider's countries", () => {
  const world = JSON.parse(readFileSync("public/maps/world.json", "utf8"));
  const names = new Set(
    world.features.map(
      (f: { properties: { name: string } }) => f.properties.name,
    ),
  );
  for (const name of [
    "Australia",
    "Brazil",
    "Canada",
    "Denmark",
    "Finland",
    "France",
    "Germany",
    "India",
    "Iran",
    "Ireland",
    "Mexico",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Serbia",
    "Spain",
    "Switzerland",
    "Turkey",
    "Ukraine",
    "United Kingdom",
    "United States",
  ])
    expect(names.has(name), name).toBe(true);
  expect(names.has("Antarctica")).toBe(false);
});
