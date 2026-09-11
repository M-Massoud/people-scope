import { describe, expect, it } from "vitest";
import { buildCountryComparison } from "@/modules/comparison/server";
import { peopleFixture } from "./fixtures/people";

describe("country age comparison", () => {
  it("uses each country's own total as the percentage denominator", () => {
    const snapshot = {
      ...peopleFixture,
      people: [18, 24, 25, 75, 34, 120].map((age, index) => ({
        ...peopleFixture.people[index],
        location: {
          ...peopleFixture.people[index].location,
          country: index < 4 ? "Canada" : "Germany",
        },
        dob: { ...peopleFixture.people[index].dob, age },
      })),
    };
    const result = buildCountryComparison(snapshot, new URLSearchParams());
    expect(result.groups.map((group) => [group.country, group.total])).toEqual([
      ["Canada", 4],
      ["Germany", 2],
    ]);
    expect(result.groups[0].ages.map((age) => age.percentage)).toEqual([
      0, 50, 25, 0, 0, 0, 0, 25,
    ]);
    expect(result.groups[1].ages.map((age) => age.percentage)).toEqual([
      0, 0, 50, 0, 0, 0, 0, 50,
    ]);
    for (const group of result.groups) {
      expect(group.ages.reduce((sum, age) => sum + age.count, 0)).toBe(
        group.total,
      );
      expect(
        group.ages.reduce((sum, age) => sum + age.percentage, 0),
      ).toBeCloseTo(100);
    }
    expect(result.meta).toEqual(snapshot.meta);
  });

  it("rejects unavailable or duplicate country selections", () => {
    expect(() =>
      buildCountryComparison(
        peopleFixture,
        new URLSearchParams({ countryA: "Atlantis" }),
      ),
    ).toThrow(/available/);
    const country = peopleFixture.people[0].location.country;
    expect(() =>
      buildCountryComparison(
        peopleFixture,
        new URLSearchParams({ countryA: country, countryB: country }),
      ),
    ).toThrow(/different/);
  });

  it("chooses two distinct available defaults and handles insufficient countries", () => {
    const result = buildCountryComparison(peopleFixture, new URLSearchParams());
    expect(result.groups).toHaveLength(2);
    expect(new Set(result.groups.map((group) => group.country)).size).toBe(2);
    expect(
      buildCountryComparison(
        { ...peopleFixture, people: [] },
        new URLSearchParams(),
      ).groups,
    ).toEqual([]);
    expect(
      buildCountryComparison(
        { ...peopleFixture, people: [peopleFixture.people[0]] },
        new URLSearchParams(),
      ).groups,
    ).toEqual([]);
  });
});
