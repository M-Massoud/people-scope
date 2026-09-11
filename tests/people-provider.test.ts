import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixturePerson } from "./fixtures/people";

let fetchPeopleSnapshot: (typeof import("@/modules/people/server/provider"))["fetchPeopleSnapshot"];
beforeEach(async () => {
  vi.resetModules();
  fetchPeopleSnapshot = (await import("@/modules/people/server/provider"))
    .fetchPeopleSnapshot;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const results = Array.from({ length: 5000 }, (_, index) =>
  fixturePerson(index),
);
const info = { seed: "northline", results: 5000, page: 1, version: "1.4" };
function serve(body: unknown = { results, info }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      if (
        url.origin !== "https://randomuser.me" ||
        url.pathname !== "/api/1.4/" ||
        url.searchParams.get("seed") !== "northline" ||
        url.searchParams.get("results") !== "5000" ||
        url.searchParams.has("nat") ||
        url.searchParams.get("inc") !==
          "name,gender,location,email,dob,registered,phone,nat,login,picture,id"
      )
        throw new Error("Unexpected Random User request.");
      return Response.json(body);
    }),
  );
}

describe("direct Random User provider", () => {
  it("preserves direct nested API fields while removing login credentials and other unused fields", async () => {
    serve({
      results: [
        {
          ...results[0],
          name: { ...results[0].name, title: "Ms" },
          login: {
            ...results[0].login,
            username: "private",
            password: "secret",
            salt: "salt",
            sha256: "hash",
          },
          picture: {
            ...results[0].picture,
            medium: "https://randomuser.me/api/portraits/med/women/0.jpg",
          },
          cell: "Unused phone field",
        },
        ...results.slice(1),
      ],
      info,
    });
    const snapshot = await fetchPeopleSnapshot();
    expect(snapshot.people).toHaveLength(5000);
    expect(snapshot.people[0]).toEqual(results[0]);
    expect(snapshot.meta.source).toBe("randomuser");
    expect(
      new Set(snapshot.people.map((person) => person.location.country)).size,
    ).toBe(5);
  });

  it("retains pictures and provider IDs without treating a missing ID as invalid", async () => {
    const picture = {
      large: "https://randomuser.me/api/portraits/women/1.jpg",
      thumbnail: "https://randomuser.me/api/portraits/thumb/women/1.jpg",
    };
    serve({
      results: [
        { ...results[0], picture, id: { name: "TEST", value: "DEMO-123" } },
        { ...results[1], picture, id: { name: "", value: null } },
        ...results.slice(2),
      ],
      info,
    });
    const snapshot = await fetchPeopleSnapshot();
    expect(snapshot.people[0]).toMatchObject({
      picture,
      id: { name: "TEST", value: "DEMO-123" },
    });
    expect(snapshot.people[1]).toMatchObject({ id: { name: "", value: null } });
    expect(snapshot.people[0].login).toEqual(results[0].login);
  });

  it("shares an in-flight batch and reuses it for five minutes", async () => {
    serve();
    const time = vi.spyOn(Date, "now").mockReturnValue(1000);
    const [first, second] = await Promise.all([
      fetchPeopleSnapshot(),
      fetchPeopleSnapshot(),
    ]);
    expect(first.people).toHaveLength(5000);
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    time.mockReturnValue(300999);
    expect(await fetchPeopleSnapshot()).toBe(first);
    time.mockReturnValue(301000);
    await expect(fetchPeopleSnapshot()).rejects.toThrow(/503/);
    serve();
    expect((await fetchPeopleSnapshot()).people).toHaveLength(5000);
  });

  it("retries failed loads without returning a local substitute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 502 })),
    );
    await expect(fetchPeopleSnapshot()).rejects.toThrow(/502/);
    serve();
    expect((await fetchPeopleSnapshot()).people[0].name.first).toBe("Amelia");
  });

  it.each([
    ["partial batch", { results: results.slice(1), info }],
    ["wrong seed", { results, info: { ...info, seed: "other" } }],
    ["wrong metadata count", { results, info: { ...info, results: 4999 } }],
    ["wrong page", { results, info: { ...info, page: 2 } }],
    ["wrong version", { results, info: { ...info, version: "1.5" } }],
    ["duplicate UUID", { results: [results[1], ...results.slice(1)], info }],
    [
      "invalid UUID",
      {
        results: [
          { ...results[0], login: { uuid: "unknown" } },
          ...results.slice(1),
        ],
        info,
      },
    ],
    [
      "invalid date",
      {
        results: [
          { ...results[0], registered: { date: "2024-02-30T12:00:00Z" } },
          ...results.slice(1),
        ],
        info,
      },
    ],
    [
      "out-of-range age",
      {
        results: [
          { ...results[0], dob: { ...results[0].dob, age: 121 } },
          ...results.slice(1),
        ],
        info,
      },
    ],
    [
      "empty country",
      {
        results: [
          { ...results[0], location: { ...results[0].location, country: " " } },
          ...results.slice(1),
        ],
        info,
      },
    ],
  ])("rejects %s", async (_label, body) => {
    serve(body);
    await expect(fetchPeopleSnapshot()).rejects.toThrow(/Random User/);
  });
});
