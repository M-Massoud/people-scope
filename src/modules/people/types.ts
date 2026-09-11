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
export type CountryRow = { name: string; count: number };
export type PeoplePage = {
  items: Person[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
