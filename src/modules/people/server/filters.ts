import type { PeopleFilters, PeopleSnapshot } from "../types";
import { CONTINENTS, continentForCountry } from "../geography";

export class InvalidFiltersError extends Error {}

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function integer(
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

export function parseFilters(
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

export function selectPeople(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
) {
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
