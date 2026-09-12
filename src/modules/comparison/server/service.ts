import { ageBands, type PeopleSnapshot } from "@/modules/people";
import {
  fetchPeopleSnapshot,
  InvalidFiltersError,
} from "@/modules/people/server";
import type { CountryComparison } from "../types";

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
    const ages = ageBands.map(({ min, max, key, label }) => {
      const count = people.filter(
        (person) => person.dob.age >= min && person.dob.age <= max,
      ).length;
      return {
        key,
        label,
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
