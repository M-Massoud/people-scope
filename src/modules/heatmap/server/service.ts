import { ageBands, type PeopleSnapshot } from "@/modules/people";
import {
  fetchPeopleSnapshot,
  InvalidFiltersError,
  parseFilters,
  selectPeople,
} from "@/modules/people/server";
import { selectParams } from "@/lib";
import type { HeatmapData } from "../types";

// A selected cell filters the explorer, not the matrix it was selected from.
const matrixParams = (params: URLSearchParams) => {
  const filters = new URLSearchParams(
    selectParams(params, ["continent", "gender"]),
  );
  const band = params.get("band");
  if (band && band !== "all") {
    const range = ageBands.find(({ filterValue }) => filterValue === band);
    if (!range) throw new InvalidFiltersError("Choose a valid age group.");
    filters.set("ageMin", String(range.min));
    filters.set("ageMax", String(range.max));
  }
  return filters;
};

export function buildHeatmap(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
): HeatmapData {
  const { people, filters } = selectPeople(snapshot, matrixParams(params));
  const ageGroups = ageBands.map(({ min, max, key, label }) => ({
    key,
    label,
    min,
    max,
  }));
  const countries = new Map<string, number[]>();
  const ageSums = new Map<string, number>();
  for (const person of people) {
    ageSums.set(
      person.location.country,
      (ageSums.get(person.location.country) ?? 0) + person.dob.age,
    );
    const counts =
      countries.get(person.location.country) ?? ageGroups.map(() => 0);
    const index = ageGroups.findIndex(
      (group) => person.dob.age >= group.min && person.dob.age <= group.max,
    );
    counts[index]++;
    countries.set(person.location.country, counts);
  }
  const rows = [...countries]
    .map(([country, counts]) => {
      const total = counts.reduce((sum, count) => sum + count, 0);
      return {
        country,
        total,
        averageAge: ageSums.get(country)! / total,
        cells: counts.map((count) => ({
          count,
          percentage: (count / total) * 100,
        })),
      };
    })
    .sort((a, b) => a.country.localeCompare(b.country, "en"));
  return {
    meta: snapshot.meta,
    filters: {
      gender: filters.gender,
      ...(filters.ageMin
        ? { ageMin: filters.ageMin, ageMax: filters.ageMax }
        : {}),
      ...(filters.continent ? { continent: filters.continent } : {}),
    },
    totalPeople: people.length,
    ageGroups,
    rows,
  };
}

export async function getHeatmap(
  params: URLSearchParams,
): Promise<HeatmapData> {
  parseFilters(matrixParams(params), { from: "1900-01-01", to: "2100-12-31" });
  return buildHeatmap(await fetchPeopleSnapshot(), params);
}
