import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fixturePerson } from "./fixtures/people";

let GET: typeof import("../src/app/api/people/[id]/route").GET;
beforeEach(async () => {
  vi.resetModules();
  GET = (await import("../src/app/api/people/[id]/route")).GET;
});
afterEach(() => vi.unstubAllGlobals());
const request = (id: string) =>
  GET(new NextRequest(`http://localhost/api/people/${id}`), {
    params: Promise.resolve({ id }),
  });
const people = Array.from({ length: 5000 }, (_, i) => fixturePerson(i));
const upstream = () =>
  vi.stubGlobal("fetch", async () =>
    Response.json({
      results: people,
      info: { seed: "northline", results: 5000, page: 1, version: "1.4" },
    }),
  );

it("returns the requested full profile with no-store", async () => {
  upstream();
  const response = await request(people[12].login.uuid);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual(people[12]);
});
it("rejects an invalid UUID before fetching", async () => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Must not fetch");
  });
  expect((await request("bad-id")).status).toBe(400);
});
it("returns 404 when the snapshot no longer contains the profile", async () => {
  upstream();
  expect((await request(fixturePerson(6000).login.uuid)).status).toBe(404);
});
it("returns a generic upstream error without leaking connection details", async () => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Private connection error");
  });
  const response = await request(people[0].login.uuid);
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: "Profile details could not be loaded. Please try again shortly.",
  });
});
