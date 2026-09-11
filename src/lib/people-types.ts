// These fields come directly from Random User. Only login.uuid is retained.
export type Person = {
  login: { uuid: string };
  name: { first: string; last: string };
  gender: "male" | "female";
  location: { city: string; state: string; country: string };
  email: string;
  dob: { date: string; age: number };
  registered: { date: string };
  phone: string;
  nat: string;
};
export type PeopleFilters = {
  continent?: string;
  from: string;
  to: string;
  country: string;
  gender: "all" | Person["gender"];
  ageMin: string;
  ageMax: string;
};
export type PeopleMeta = {
  source: "randomuser";
  label: string;
  fetchedAt: string;
};
export type PeopleSnapshot = { people: Person[]; meta: PeopleMeta };
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
export type CountryRow = { name: string; count: number };
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
export type PeoplePage = {
  items: Person[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
export type PeopleReportKind =
  "registrations" | "ages" | "demographics" | "countries";

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
