import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fixturePerson } from "./fixtures/people";

const people = Array.from({ length: 5000 }, (_, index) => fixturePerson(index));
const fallback =
  "Random User profiles could not be loaded. Please try again shortly.";
const routes = [
  {
    name: "reports",
    load: () => import("../src/app/api/reports/route"),
    invalid: "gender=invalid",
    message: "Choose all, male, or female for gender.",
    expected: { metrics: { totalPeople: 5000 } },
  },
  {
    name: "people",
    load: () => import("../src/app/api/people/route"),
    invalid: "gender=invalid",
    message: "Choose all, male, or female for gender.",
    expected: { total: 5000, page: 1, pageSize: 25 },
  },
  {
    name: "comparison",
    load: () => import("../src/app/api/comparison/route"),
    invalid: "countryA=Canada&countryB=Canada",
    message: "Choose two different countries to compare.",
    expected: {
      groups: [
        { country: "Canada", total: 1000 },
        { country: "Germany", total: 1000 },
      ],
    },
  },
  {
    name: "heatmap",
    load: () => import("../src/app/api/heatmap/route"),
    invalid: "band=75%2B",
    message: "Choose a valid age group.",
    expected: { totalPeople: 5000, filters: { gender: "all" } },
  },
];

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

function upstream() {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      results: people,
      info: { seed: "northline", results: 5000, page: 1, version: "1.4" },
    }),
  );
}

describe.each(routes)("$name response policy", (route) => {
  it("returns successful service data with no-store", async () => {
    const { GET } = await route.load();
    upstream();
    const response = await GET(
      new NextRequest(`http://localhost/api/${route.name}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject(route.expected);
  });

  it("returns validation messages as no-store HTTP 400", async () => {
    const { GET } = await route.load();
    upstream();
    const response = await GET(
      new NextRequest(`http://localhost/api/${route.name}?${route.invalid}`),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: route.message });
  });

  it("returns a safe no-store HTTP 502 for an upstream failure", async () => {
    const { GET } = await route.load();
    vi.stubGlobal("fetch", () => {
      throw new Error("Private connection details must never reach a response");
    });
    const response = await GET(
      new NextRequest(`http://localhost/api/${route.name}`),
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: fallback });
  });
});

describe("profile response policy", () => {
  it("preserves the no-store missing profile response", async () => {
    const { GET } = await import("../src/app/api/people/[id]/route");
    upstream();
    const id = fixturePerson(6000).login.uuid;
    const response = await GET(
      new NextRequest(`http://localhost/api/people/${id}`),
      {
        params: Promise.resolve({ id }),
      },
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error:
        "This profile is no longer available. Refresh the table and choose another person.",
    });
  });

  it("preserves profile validation and its custom upstream fallback with no-store", async () => {
    const { GET } = await import("../src/app/api/people/[id]/route");
    vi.stubGlobal("fetch", () => {
      throw new Error("Private profile connection details");
    });
    for (const [id, status, error] of [
      ["bad-id", 400, "Choose a valid profile ID."],
      [
        people[0].login.uuid,
        502,
        "Profile details could not be loaded. Please try again shortly.",
      ],
    ] as const) {
      const response = await GET(
        new NextRequest(`http://localhost/api/people/${id}`),
        {
          params: Promise.resolve({ id }),
        },
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ error });
    }
  });
});
