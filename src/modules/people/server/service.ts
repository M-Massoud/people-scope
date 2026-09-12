import { z } from "zod";
import type {
  PeoplePage,
  PeopleSnapshot,
  Person,
  PersonSummary,
} from "../types";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/config";
import { fetchPeopleSnapshot } from "./provider";
import {
  InvalidFiltersError,
  integer,
  parseFilters,
  selectPeople,
} from "./filters";

const sorts = [
  "registered_desc",
  "registered_asc",
  "name_asc",
  "name_desc",
  "age_asc",
  "age_desc",
] as const;
type PeopleSort = (typeof sorts)[number];
function parseExplorer(params: URLSearchParams) {
  const rawSearch = params.get("search") ?? "";
  if (rawSearch.length > 100)
    throw new InvalidFiltersError(
      "Search must contain 100 characters or fewer.",
    );
  const sort = params.get("sort") ?? "registered_desc";
  if (!sorts.some((value) => value === sort))
    throw new InvalidFiltersError("Choose a valid person sort order.");
  const page = integer(params.get("page") ?? "1", "page number", 1);
  const pageSize = integer(
    params.get("pageSize") ?? String(DEFAULT_TABLE_PAGE_SIZE),
    "page size",
    1,
  );
  if (!TABLE_PAGE_SIZES.includes(pageSize))
    throw new InvalidFiltersError(
      `Choose one of these page sizes: ${TABLE_PAGE_SIZES.join(", ")}.`,
    );
  return {
    search: rawSearch.trim().toLocaleLowerCase("en"),
    sort: sort as PeopleSort,
    page,
    pageSize,
  };
}

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });
// At most six sort orders per immutable provider snapshot. A refreshed snapshot
// gets its own entries; WeakMap lets old snapshots and indexes be collected.
const sortedSnapshots = new WeakMap<
  PeopleSnapshot,
  Map<PeopleSort, PeopleSnapshot>
>();

function sortedSnapshot(snapshot: PeopleSnapshot, sort: PeopleSort) {
  let orders = sortedSnapshots.get(snapshot);
  if (!orders) {
    orders = new Map();
    sortedSnapshots.set(snapshot, orders);
  }
  let sorted = orders.get(sort);
  if (!sorted) {
    sorted = {
      ...snapshot,
      people: [...snapshot.people].sort((a, b) => comparePeople(a, b, sort)),
    };
    orders.set(sort, sorted);
  }
  return sorted;
}

function toPersonSummary(person: Person): PersonSummary {
  return {
    login: person.login,
    name: person.name,
    email: person.email,
    gender: person.gender,
    location: { city: person.location.city, country: person.location.country },
    dob: { age: person.dob.age },
    registered: person.registered,
    picture: { thumbnail: person.picture.thumbnail },
  };
}

function comparePeople(a: Person, b: Person, sort: PeopleSort) {
  let order: number;
  if (sort.startsWith("age_")) order = a.dob.age - b.dob.age;
  else if (sort.startsWith("name_"))
    order = nameCollator.compare(
      `${a.name.first} ${a.name.last}`,
      `${b.name.first} ${b.name.last}`,
    );
  else order = Date.parse(a.registered.date) - Date.parse(b.registered.date);
  if (sort.endsWith("_desc")) order = -order;
  return order || a.login.uuid.localeCompare(b.login.uuid, "en");
}

export function buildPeoplePage(
  snapshot: PeopleSnapshot,
  params: URLSearchParams,
): PeoplePage {
  const query = parseExplorer(params);
  const { people } = selectPeople(sortedSnapshot(snapshot, query.sort), params);
  const results = people.filter(
    (person) =>
      !query.search ||
      [
        `${person.name.first} ${person.name.last}`,
        person.email,
        person.location.city,
        person.location.state,
        person.location.country,
      ].some((value) => value.toLocaleLowerCase("en").includes(query.search)),
  );
  const total = results.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * query.pageSize;
  return {
    items: results.slice(offset, offset + query.pageSize).map(toPersonSummary),
    total,
    page,
    pageSize: query.pageSize,
    pageCount,
  };
}

export async function getPeoplePage(
  params: URLSearchParams,
): Promise<PeoplePage> {
  parseExplorer(params);
  parseFilters(params, { from: "1900-01-01", to: "2100-12-31" });
  return buildPeoplePage(await fetchPeopleSnapshot(), params);
}

export async function getPerson(id: string): Promise<Person | undefined> {
  if (!z.uuid().safeParse(id).success)
    throw new InvalidFiltersError("Choose a valid profile ID.");
  const snapshot = await fetchPeopleSnapshot();
  return snapshot.people.find((person) => person.login.uuid === id);
}
