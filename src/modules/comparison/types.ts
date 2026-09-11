import type { PeopleMeta } from "@/modules/people";

export type CountryAgeGroup = {
  country: string;
  total: number;
  ages: { key: string; label: string; count: number; percentage: number }[];
};
export type CountryComparison = {
  availableCountries: string[];
  meta: PeopleMeta;
  groups: CountryAgeGroup[];
};
