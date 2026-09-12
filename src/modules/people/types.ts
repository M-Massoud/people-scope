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
  picture: { large: string; thumbnail: string };
  id: { name: string; value: string | null };
};
// The table receives only visible fields. Full details are fetched on selection.
export type PersonSummary = Pick<
  Person,
  "login" | "name" | "gender" | "email" | "registered"
> & {
  location: Pick<Person["location"], "city" | "country">;
  dob: Pick<Person["dob"], "age">;
  picture: Pick<Person["picture"], "thumbnail">;
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
  items: PersonSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
