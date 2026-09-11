import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getReportRoute } from "../src/app/api/reports/route";
import { GET as getPeopleRoute } from "../src/app/api/people/route";
import type { PeopleSnapshot } from "@/modules/people";
import { InvalidFiltersError, buildPeoplePage } from "@/modules/people/server";
import { buildPeopleReport } from "@/modules/reports/server";
import { fixturePerson, peopleFixture } from "./fixtures/people";

const snapshot: PeopleSnapshot = {
  meta: peopleFixture.meta,
  people: [
    fixturePerson(0, {
      name: { first: "Ada", last: "Young" },
      dob: { date: "2009-01-01T00:00:00Z", age: 17 },
      registered: { date: "2020-12-31T23:59:59Z" },
    }),
    fixturePerson(1, {
      name: { first: "Ben", last: "Adams" },
      dob: { date: "2008-01-01T00:00:00Z", age: 18 },
      registered: { date: "2022-01-01T00:00:00Z" },
    }),
    fixturePerson(2, {
      name: { first: "Cara", last: "Adams" },
      location: { city: "Quebec", state: "Quebec", country: "Canada" },
      dob: { date: "2002-01-01T00:00:00Z", age: 24 },
      registered: { date: "2022-02-15T23:59:59Z" },
    }),
    fixturePerson(3, {
      name: { first: "Dan", last: "Zhang" },
      dob: { date: "1951-01-01T00:00:00Z", age: 75 },
      registered: { date: "2022-02-15T23:59:59Z" },
    }),
  ],
};
const params = (query = "") => new URLSearchParams(query);
afterEach(() => vi.unstubAllGlobals());

describe("people reports", () => {
  it("aggregates only direct ages, countries, and registration dates over the full available period", () => {
    const report = buildPeopleReport(snapshot, params());
    expect(report.filters).toEqual({
      from: "2020-12-31",
      to: "2022-02-15",
      country: "all",
      gender: "all",
      ageMin: "",
      ageMax: "",
    });
    expect(report.metrics).toEqual({
      totalPeople: 4,
      averageAge: 33.5,
      countryCount: 3,
    });
    expect(report.countries).toEqual([
      { name: "Canada", count: 2 },
      { name: "France", count: 1 },
      { name: "United Kingdom", count: 1 },
    ]);
    expect(report.ages.find((row) => row.key === "18-24")).toEqual({
      key: "18-24",
      label: "18–24",
      min: 18,
      max: 24,
      total: 2,
      male: 1,
      female: 1,
    });
    expect(report.ages.find((row) => row.key === "75+")?.total).toBe(1);
    expect(report).not.toHaveProperty("people");
  });

  it("includes zero years and clips the first and last year boundaries", () => {
    const report = buildPeopleReport(snapshot, params());
    expect(report.timeline).toEqual([
      {
        key: "2020",
        label: "2020",
        from: "2020-12-31",
        to: "2020-12-31",
        count: 1,
      },
      {
        key: "2021",
        label: "2021",
        from: "2021-01-01",
        to: "2021-12-31",
        count: 0,
      },
      {
        key: "2022",
        label: "2022",
        from: "2022-01-01",
        to: "2022-02-15",
        count: 3,
      },
    ]);
  });

  it("groups by month with inclusive dates and a zero month", () => {
    const report = buildPeopleReport(
      snapshot,
      params("from=2021-12-15&to=2022-02-15&grouping=month"),
    );
    expect(
      report.timeline.map(({ key, from, to, count }) => ({
        key,
        from,
        to,
        count,
      })),
    ).toEqual([
      { key: "2021-12", from: "2021-12-15", to: "2021-12-31", count: 0 },
      { key: "2022-01", from: "2022-01-01", to: "2022-01-31", count: 1 },
      { key: "2022-02", from: "2022-02-01", to: "2022-02-15", count: 2 },
    ]);
  });

  it("combines country, gender, inclusive age, and registration filters without narrowing country options", () => {
    const report = buildPeopleReport(
      snapshot,
      params(
        "country=Canada&gender=female&ageMin=18&ageMax=24&from=2022-01-01",
      ),
    );
    expect(report.metrics).toEqual({
      totalPeople: 1,
      averageAge: 24,
      countryCount: 1,
    });
    expect(report.availableCountries).toEqual([
      "Canada",
      "France",
      "United Kingdom",
    ]);
    expect(report.availablePeriod).toEqual({
      from: "2020-12-31",
      to: "2022-02-15",
    });
  });

  it("returns null average age and all empty age bands for a valid empty selection", () => {
    const report = buildPeopleReport(
      snapshot,
      params("country=France&ageMin=90"),
    );
    expect(report.metrics).toEqual({
      totalPeople: 0,
      averageAge: null,
      countryCount: 0,
    });
    expect(report.ages).toHaveLength(8);
    expect(
      report.ages.every(
        (row) => row.total === 0 && row.male === 0 && row.female === 0,
      ),
    ).toBe(true);
    expect(report.countries).toEqual([]);
  });

  it("ignores explorer-only parameters when computing reports", () => {
    expect(
      buildPeopleReport(snapshot, params("search=missing&page=0&sort=invalid"))
        .metrics.totalPeople,
    ).toBe(4);
  });

  it.each([
    "country=Missing",
    "gender=other",
    "gender=",
    "ageMin=-1",
    "ageMax=121",
    "ageMin=2.5",
    "ageMin=40&ageMax=20",
    "from=2022-02-30",
    "from=1899-12-31",
    "to=2101-01-01",
    "from=2022-02-16",
    "grouping=week",
  ])('rejects invalid filters "%s"', (query) => {
    expect(() => buildPeopleReport(snapshot, params(query))).toThrow(
      InvalidFiltersError,
    );
  });
});

describe("people explorer", () => {
  it("returns direct person fields newest first with UUIDs breaking equal registration ties", () => {
    expect(
      buildPeoplePage(snapshot, params()).items.map(
        (person) => person.name.first,
      ),
    ).toEqual(["Cara", "Dan", "Ben", "Ada"]);
  });

  it.each([
    ["registered_asc", ["Ada", "Ben", "Cara", "Dan"]],
    ["name_asc", ["Ada", "Ben", "Cara", "Dan"]],
    ["name_desc", ["Dan", "Cara", "Ben", "Ada"]],
    ["age_asc", ["Ada", "Ben", "Cara", "Dan"]],
    ["age_desc", ["Dan", "Cara", "Ben", "Ada"]],
  ])("sorts by %s", (sort, names) => {
    expect(
      buildPeoplePage(snapshot, params(`sort=${sort}`)).items.map(
        (person) => person.name.first,
      ),
    ).toEqual(names);
  });

  it.each(["+CARA+", "Quebec", "sofia.taylor3%40example.com"])(
    'searches direct person fields with "%s"',
    (search) => {
      expect(
        buildPeoplePage(snapshot, params(`search=${search}`)).items.map(
          (person) => person.name.first,
        ),
      ).toEqual(["Cara"]);
    },
  );

  it("applies the same global filters before searching", () => {
    expect(
      buildPeoplePage(
        snapshot,
        params("country=Canada&ageMin=18&search=adams"),
      ).items.map((person) => person.name.first),
    ).toEqual(["Cara"]);
  });

  it("does not search unlisted UUID or phone fields", () => {
    expect(
      buildPeoplePage(snapshot, params(`search=${snapshot.people[0].phone}`))
        .total,
    ).toBe(0);
    expect(
      buildPeoplePage(
        snapshot,
        params(`search=${snapshot.people[0].login.uuid}`),
      ).total,
    ).toBe(0);
  });

  it("clamps pages and provides enough offline fixture rows for explorer pagination", () => {
    const page = buildPeoplePage(peopleFixture, params("page=999&pageSize=25"));
    expect(page).toMatchObject({
      total: 60,
      page: 3,
      pageSize: 25,
      pageCount: 3,
    });
    expect(page.items).toHaveLength(10);
    expect(
      buildPeoplePage(snapshot, params("search=missing&page=999")),
    ).toEqual({ total: 0, items: [], page: 1, pageSize: 25, pageCount: 1 });
  });

  it.each([
    "page=0",
    "page=1.2",
    "page=-1",
    "page=9007199254740992",
    "pageSize=20",
    "pageSize=",
    "sort=invalid",
    `search=${"a".repeat(101)}`,
  ])('rejects malformed explorer query "%s"', (query) => {
    expect(() => buildPeoplePage(snapshot, params(query))).toThrow(
      InvalidFiltersError,
    );
  });
});

describe("people API boundaries", () => {
  it.each([getReportRoute, getPeopleRoute])(
    "returns no-store 400 responses for invalid global filters",
    async (route) => {
      vi.stubGlobal("fetch", async () => {
        throw new Error("Upstream should not be reached for invalid filters.");
      });
      const response = await route(
        new NextRequest("http://localhost/api/test?ageMin=121"),
      );
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toHaveProperty("error");
    },
  );

  it.each([getReportRoute, getPeopleRoute])(
    "returns a generic no-store 502 response when the upstream fails",
    async (route) => {
      vi.stubGlobal("fetch", async () => {
        throw new Error("Sensitive upstream connection details");
      });
      const response = await route(
        new NextRequest("http://localhost/api/test"),
      );
      expect(response.status).toBe(502);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error:
          "Random User profiles could not be loaded. Please try again shortly.",
      });
    },
  );
});
