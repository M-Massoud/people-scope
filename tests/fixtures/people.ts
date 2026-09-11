import type { Person, PeopleSnapshot } from "@/modules/people";

// Offline test data only. Production always reads the validated Random User API.
export function fixturePerson(
  index: number,
  overrides: Partial<Person> = {},
): Person {
  const places = [
    { country: "Canada", city: "Toronto", state: "Ontario", nat: "CA" },
    { country: "France", city: "Lyon", state: "Rhône", nat: "FR" },
    { country: "Germany", city: "Berlin", state: "Berlin", nat: "DE" },
    {
      country: "United Kingdom",
      city: "Bristol",
      state: "Somerset",
      nat: "GB",
    },
    {
      country: "United States",
      city: "Seattle",
      state: "Washington",
      nat: "US",
    },
  ];
  const place = places[index % places.length];
  const age = [16, 21, 29, 38, 49, 58, 69, 81][index % 8];
  const first = ["Amelia", "Noah", "Sofia", "Leo", "Maya", "Ethan"][index % 6];
  const last = ["Martin", "Wilson", "Taylor", "Brown", "Clark"][index % 5];
  const year = 2004 + (index % 21);
  const month = String(1 + (index % 12)).padStart(2, "0");
  const day = String(1 + (index % 27)).padStart(2, "0");
  return {
    login: {
      uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    },
    name: { first, last },
    gender: index % 2 ? "male" : "female",
    location: { city: place.city, state: place.state, country: place.country },
    email: `${first.toLowerCase()}.${last.toLowerCase()}${index + 1}@example.com`,
    dob: { date: `${2026 - age}-01-15T12:00:00.000Z`, age },
    registered: { date: `${year}-${month}-${day}T12:00:00.000Z` },
    phone: `555-010-${String(index + 1).padStart(4, "0")}`,
    nat: place.nat,
    picture: {
      large: `https://randomuser.me/api/portraits/${index % 2 ? "men" : "women"}/${index % 99}.jpg`,
      thumbnail: `https://randomuser.me/api/portraits/thumb/${index % 2 ? "men" : "women"}/${index % 99}.jpg`,
    },
    id: { name: "DEMO", value: index % 3 ? `SAMPLE-${index + 1}` : null },
    ...overrides,
  };
}

export const peopleFixture: PeopleSnapshot = {
  people: Array.from({ length: 60 }, (_, index) => fixturePerson(index)),
  meta: {
    source: "randomuser",
    label: "Random User · 5,000 generated profiles",
    fetchedAt: "2026-09-11T12:00:00.000Z",
  },
};
peopleFixture.people[0].registered.date = "2004-01-01T00:00:00.000Z";
peopleFixture.people[59].registered.date = "2024-12-31T23:59:59.000Z";
