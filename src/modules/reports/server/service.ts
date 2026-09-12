import {
  ageBands,
  type PeopleFilters,
  type PeopleSnapshot,
} from "@/modules/people";
import {
  fetchPeopleSnapshot,
  InvalidFiltersError,
  parseFilters,
  selectPeople,
} from "@/modules/people/server";
import type { AgeRow, PeopleReport, TimelineRow } from "../types";

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const iso = (date: Date) => date.toISOString().slice(0, 10);

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
  const ages: AgeRow[] = ageBands.map(({ min, max, key, label }) => ({
    key,
    label,
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

export async function getPeopleReport(
  params: URLSearchParams,
): Promise<PeopleReport> {
  parseGrouping(params);
  parseFilters(params, { from: "1900-01-01", to: "2100-12-31" });
  return buildPeopleReport(await fetchPeopleSnapshot(), params);
}
