import type {
  AgeRow,
  CountryComparison,
  PeopleFilters,
  PeoplePage,
  PeopleReport,
  PeopleSnapshot,
  Person,
  TimelineRow,
} from "../lib/people-types";
import { fetchPeopleSnapshot } from "./people-provider";
import { CONTINENTS, continentForCountry } from "../lib/geography";

export class InvalidFiltersError extends Error {}

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const ageBands = [
  [0, 17],
  [18, 24],
  [25, 34],
  [35, 44],
  [45, 54],
  [55, 64],
  [65, 74],
  [75, 120],
] as const;
const sorts = [
  "registered_desc",
  "registered_asc",
  "name_asc",
  "name_desc",
  "age_asc",
  "age_desc",
] as const;
type PeopleSort = (typeof sorts)[number];
const iso = (date: Date) => date.toISOString().slice(0, 10);

function integer(
  value: string,
  label: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  const number = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  )
    throw new InvalidFiltersError(`Choose a valid ${label}.`);
  return number;
}

function civilDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    iso(date) !== value ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    throw new InvalidFiltersError(
      "Choose valid calendar dates between 1900 and 2100.",
    );
  return value;
}

function parseFilters(
  params: URLSearchParams,
  period: { from: string; to: string },
): PeopleFilters {
  const from = civilDate(params.get("from") ?? period.from);
  const to = civilDate(params.get("to") ?? period.to);
  if (from > to)
    throw new InvalidFiltersError("Start date must be on or before end date.");
  const country = params.get("country") ?? "all";
  if (!country.trim() || country.length > 200)
    throw new InvalidFiltersError("Choose a valid country.");
  const gender = params.get("gender") ?? "all";
  if (gender !== "all" && gender !== "male" && gender !== "female")
    throw new InvalidFiltersError("Choose all, male, or female for gender.");
  const ageMin = params.get("ageMin") ?? "";
  const ageMax = params.get("ageMax") ?? "";
  if (ageMin !== "") integer(ageMin, "minimum age from 0 to 120", 0, 120);
  if (ageMax !== "") integer(ageMax, "maximum age from 0 to 120", 0, 120);
  if (ageMin !== "" && ageMax !== "" && Number(ageMin) > Number(ageMax))
    throw new InvalidFiltersError("Minimum age must not exceed maximum age.");
  const continent = params.get("continent");
  if (continent !== null && !CONTINENTS.includes(continent))
    throw new InvalidFiltersError("Choose a valid continent.");
  return {
    from,
    to,
    country,
    gender,
    ageMin,
    ageMax,
    ...(continent ? { continent } : {}),
  };
}

function selectPeople(snapshot: PeopleSnapshot, params: URLSearchParams) {
  const dates = snapshot.people.map((person) =>
    person.registered.date.slice(0, 10),
  );
  const fallback = snapshot.meta.fetchedAt.slice(0, 10);
  const availablePeriod = dates.reduce(
    (period, date) => ({
      from: date < period.from ? date : period.from,
      to: date > period.to ? date : period.to,
    }),
    { from: dates[0] ?? fallback, to: dates[0] ?? fallback },
  );
  const availableCountries = [
    ...new Set(snapshot.people.map((person) => person.location.country)),
  ].sort((a, b) => a.localeCompare(b, "en"));
  const filters = parseFilters(params, availablePeriod);
  if (
    filters.country !== "all" &&
    !availableCountries.includes(filters.country)
  )
    throw new InvalidFiltersError(
      "Choose a country available in the loaded profiles.",
    );
  const people = snapshot.people.filter((person) => {
    const date = person.registered.date.slice(0, 10);
    return (
      date >= filters.from &&
      date <= filters.to &&
      (!filters.continent ||
        continentForCountry(person.location.country) === filters.continent) &&
      (filters.country === "all" ||
        person.location.country === filters.country) &&
      (filters.gender === "all" || person.gender === filters.gender) &&
      (filters.ageMin === "" || person.dob.age >= Number(filters.ageMin)) &&
      (filters.ageMax === "" || person.dob.age <= Number(filters.ageMax))
    );
  });
  return { people, filters, availablePeriod, availableCountries };
}

function parseGrouping(params: URLSearchParams): PeopleReport["grouping"] {
  const grouping = params.get("grouping") ?? "year";
  if (grouping !== "year" && grouping !== "month")
    throw new InvalidFiltersError("Choose year or month grouping.");
  return grouping;
}

function makeTimeline(
  filters: PeopleFilters,
  grouping: PeopleReport["grouping"],
) {
  const timeline = new Map<string, TimelineRow>();
  const start = new Date(`${filters.from}T00:00:00Z`);
  const cursor = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      grouping === "year" ? 0 : start.getUTCMonth(),
      1,
    ),
  );
  while (iso(cursor) <= filters.to) {
    const first = iso(cursor);
    const key = first.slice(0, grouping === "year" ? 4 : 7);
    const next = new Date(cursor);
    if (grouping === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    const last = iso(new Date(next.getTime() - 86_400_000));
    timeline.set(key, {
      key,
      label: grouping === "year" ? key : monthLabel.format(cursor),
      from: first < filters.from ? filters.from : first,
      to: last > filters.to ? filters.to : last,
      count: 0,
    });
    cursor.setTime(next.getTime());
  }
  return timeline;
}

export function buildPeopleReport(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
): PeopleReport {
  const grouping = parseGrouping(params);
  const { people, filters, availablePeriod, availableCountries } = selectPeople(
    snapshot,
    params,
  );
  const timeline = makeTimeline(filters, grouping);
  const ages: AgeRow[] = ageBands.map(([min, max]) => ({
    key: min === 75 ? "75+" : `${min}-${max}`,
    label: min === 75 ? "75+" : `${min}–${max}`,
    min,
    max,
    total: 0,
    male: 0,
    female: 0,
  }));
  const countries = new Map<string, number>();
  let ageSum = 0;
  for (const person of people) {
    timeline.get(person.registered.date.slice(0, grouping === "year" ? 4 : 7))!
      .count++;
    const band = ages.find(
      (row) => person.dob.age >= row.min && person.dob.age <= row.max,
    )!;
    band.total++;
    band[person.gender]++;
    countries.set(
      person.location.country,
      (countries.get(person.location.country) ?? 0) + 1,
    );
    ageSum += person.dob.age;
  }
  return {
    filters,
    availablePeriod,
    availableCountries,
    meta: snapshot.meta,
    grouping,
    metrics: {
      totalPeople: people.length,
      averageAge: people.length ? ageSum / people.length : null,
      countryCount: countries.size,
    },
    timeline: [...timeline.values()],
    ages,
    countries: [...countries]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en")),
  };
}

function parseExplorer(params: URLSearchParams) {
  const rawSearch = params.get("search") ?? "";
  if (rawSearch.length > 100)
    throw new InvalidFiltersError(
      "Search must contain 100 characters or fewer.",
    );
  const sort = params.get("sort") ?? "registered_desc";
  if (!sorts.some((value) => value === sort))
    throw new InvalidFiltersError("Choose a valid person sort order.");
  const page = integer(params.get("page") ?? "1", "page number", 1);
  const pageSize = integer(params.get("pageSize") ?? "25", "page size", 1);
  if (![10, 25, 50, 100].includes(pageSize))
    throw new InvalidFiltersError("Choose 10, 25, 50, or 100 people per page.");
  return {
    search: rawSearch.trim().toLocaleLowerCase("en"),
    sort: sort as PeopleSort,
    page,
    pageSize,
  };
}

function comparePeople(a: Person, b: Person, sort: PeopleSort) {
  let order: number;
  if (sort.startsWith("age_")) order = a.dob.age - b.dob.age;
  else if (sort.startsWith("name_"))
    order = `${a.name.first} ${a.name.last}`.localeCompare(
      `${b.name.first} ${b.name.last}`,
      "en",
      { sensitivity: "base" },
    );
  else order = Date.parse(a.registered.date) - Date.parse(b.registered.date);
  if (sort.endsWith("_desc")) order = -order;
  return order || a.login.uuid.localeCompare(b.login.uuid, "en");
}

export function buildPeoplePage(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
): PeoplePage {
  const query = parseExplorer(params);
  const { people } = selectPeople(snapshot, params);
  const results = people
    .filter(
      (person) =>
        !query.search ||
        [
          `${person.name.first} ${person.name.last}`,
          person.email,
          person.location.city,
          person.location.state,
          person.location.country,
        ].some((value) => value.toLocaleLowerCase("en").includes(query.search)),
    )
    .sort((a, b) => comparePeople(a, b, query.sort));
  const total = results.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * query.pageSize;
  return {
    items: results.slice(offset, offset + query.pageSize),
    total,
    page,
    pageSize: query.pageSize,
    pageCount,
  };
}

export async function getPeopleReport(
  params: URLSearchParams,
): Promise<PeopleReport> {
  parseGrouping(params);
  parseFilters(params, { from: "1900-01-01", to: "2100-12-31" });
  return buildPeopleReport(await fetchPeopleSnapshot(), params);
}

export async function getPeoplePage(
  params: URLSearchParams,
): Promise<PeoplePage> {
  parseExplorer(params);
  parseFilters(params, { from: "1900-01-01", to: "2100-12-31" });
  return buildPeoplePage(await fetchPeopleSnapshot(), params);
}

export function buildCountryComparison(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
): CountryComparison {
  const availableCountries = [
    ...new Set(snapshot.people.map((person) => person.location.country)),
  ].sort((a, b) => a.localeCompare(b, "en"));
  for (const key of ["countryA", "countryB"]) {
    if (params.has(key) && !availableCountries.includes(params.get(key)!))
      throw new InvalidFiltersError(
        "Choose a country available in the loaded profiles.",
      );
  }
  if (availableCountries.length < 2)
    return { availableCountries, meta: snapshot.meta, groups: [] };
  const countryA =
    params.get("countryA") ??
    (availableCountries.includes("Canada") ? "Canada" : availableCountries[0]);
  const countryB =
    params.get("countryB") ??
    (countryA !== "Germany" && availableCountries.includes("Germany")
      ? "Germany"
      : availableCountries.find((country) => country !== countryA)!);
  if (countryA === countryB)
    throw new InvalidFiltersError("Choose two different countries to compare.");

  // Both groups come from the same cached API batch. No invented profile fields.
  const groups = [countryA, countryB].map((country) => {
    const people = snapshot.people.filter(
      (person) => person.location.country === country,
    );
    const total = people.length;
    const ages = ageBands.map(([min, max]) => {
      const count = people.filter(
        (person) => person.dob.age >= min && person.dob.age <= max,
      ).length;
      return {
        key: min === 75 ? "75+" : `${min}-${max}`,
        label: min === 75 ? "75+" : `${min}–${max}`,
        count,
        percentage: total ? (count / total) * 100 : 0,
      };
    });
    return { country, total, ages };
  });
  return { availableCountries, meta: snapshot.meta, groups };
}

export async function getCountryComparison(params: URLSearchParams) {
  return buildCountryComparison(await fetchPeopleSnapshot(), params);
}
