import type { CountryRow } from "./types";

// Random User supplies location.country, not continent. Geographic lookup for
// its supported countries, based on https://unstats.un.org/unsd/methodology/m49/.
// The Americas are split into North/South America; Mexico is in North America.
const countriesByContinent: Record<string, readonly string[]> = {
  Europe: [
    "Denmark",
    "Finland",
    "France",
    "Germany",
    "Ireland",
    "Netherlands",
    "Norway",
    "Serbia",
    "Spain",
    "Switzerland",
    "Ukraine",
    "United Kingdom",
  ],
  Asia: ["India", "Iran", "Turkey", "Türkiye"],
  "North America": ["Canada", "Mexico", "United States"],
  "South America": ["Brazil"],
  Oceania: ["Australia", "New Zealand"],
};
export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
  "Unmapped",
];

export function continentForCountry(country: string): string {
  return (
    Object.entries(countriesByContinent).find(([, countries]) =>
      countries.includes(country),
    )?.[0] ?? "Unmapped"
  );
}

export function groupByContinent(countries: CountryRow[]): CountryRow[] {
  const totals = new Map<string, number>();
  for (const country of countries) {
    const continent = continentForCountry(country.name);
    totals.set(continent, (totals.get(continent) ?? 0) + country.count);
  }
  return [...totals]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));
}
