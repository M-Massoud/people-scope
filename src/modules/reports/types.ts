import type { PeopleFilters, PeopleMeta, CountryRow } from "@/modules/people";

export type TimelineRow = {
  key: string;
  label: string;
  from: string;
  to: string;
  count: number;
};
export type AgeRow = {
  key: string;
  label: string;
  min: number;
  max: number;
  total: number;
  male: number;
  female: number;
};
export type PeopleReport = {
  filters: PeopleFilters;
  availablePeriod: { from: string; to: string };
  availableCountries: string[];
  meta: PeopleMeta;
  grouping: "year" | "month";
  metrics: {
    totalPeople: number;
    averageAge: number | null;
    countryCount: number;
  };
  timeline: TimelineRow[];
  ages: AgeRow[];
  countries: CountryRow[];
};
export type PeopleReportKind =
  "registrations" | "ages" | "demographics" | "countries";
