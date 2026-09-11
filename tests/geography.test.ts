import { describe, expect, it } from "vitest";
import { continentForCountry, groupByContinent } from "../src/lib/geography";
import {
  buildPeoplePage,
  buildPeopleReport,
} from "../src/server/people-service";
import { peopleFixture } from "./fixtures/people";

describe("continent grouping", () => {
  it("adds existing country counts without losing unmapped countries", () => {
    expect(
      groupByContinent([
        { name: "Germany", count: 4 },
        { name: "France", count: 3 },
        { name: "India", count: 2 },
        { name: "Canada", count: 5 },
        { name: "Mexico", count: 1 },
        { name: "Brazil", count: 2 },
        { name: "Australia", count: 2 },
        { name: "Unlisted country", count: 1 },
      ]),
    ).toEqual([
      { name: "Europe", count: 7 },
      { name: "North America", count: 6 },
      { name: "Asia", count: 2 },
      { name: "Oceania", count: 2 },
      { name: "South America", count: 2 },
      { name: "Unmapped", count: 1 },
    ]);
    expect(continentForCountry("Turkey")).toBe("Asia");
    expect(continentForCountry("Serbia")).toBe("Europe");
  });
  it("continent drills filter the report and matching people by location", () => {
    const params = new URLSearchParams({
      continent: "Europe",
      pageSize: "100",
    });
    const report = buildPeopleReport(peopleFixture, params);
    const page = buildPeoplePage(peopleFixture, params);
    expect(report.metrics.totalPeople).toBe(36);
    expect(page.total).toBe(36);
    expect(
      page.items.every((person) =>
        ["France", "Germany", "United Kingdom"].includes(
          person.location.country,
        ),
      ),
    ).toBe(true);
    expect(() =>
      buildPeopleReport(
        peopleFixture,
        new URLSearchParams({ continent: "Atlantis" }),
      ),
    ).toThrow(/continent/);
  });
});
