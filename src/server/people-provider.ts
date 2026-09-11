import { z } from "zod";
import type { PeopleSnapshot } from "../lib/people-types";

const text = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim().length > 0);
const personSchema = z.object({
  login: z.object({ uuid: z.uuid() }),
  name: z.object({ first: text, last: text }),
  gender: z.enum(["male", "female"]),
  location: z.object({ city: text, state: text, country: text }),
  email: z.email(),
  dob: z.object({
    date: z.iso.datetime(),
    age: z.number().int().min(0).max(120),
  }),
  registered: z.object({ date: z.iso.datetime() }),
  phone: text,
  nat: z.string().regex(/^[A-Z]{2}$/),
});
const batchSchema = z
  .object({
    results: z.array(personSchema).length(5000),
    info: z.object({
      seed: z.literal("northline"),
      results: z.literal(5000),
      page: z.literal(1),
      version: z.literal("1.4"),
    }),
  })
  .refine(
    (batch) =>
      new Set(batch.results.map((person) => person.login.uuid)).size ===
      batch.results.length,
    "Random User UUIDs must be unique.",
  );

let cached: { snapshot: PeopleSnapshot; expiresAt: number } | undefined;
let inFlight: Promise<PeopleSnapshot> | undefined;

export function fetchPeopleSnapshot(): Promise<PeopleSnapshot> {
  if (cached && cached.expiresAt > Date.now())
    return Promise.resolve(cached.snapshot);
  if (!inFlight) {
    inFlight = loadSnapshot()
      .then((snapshot) => {
        cached = { snapshot, expiresAt: Date.now() + 5 * 60_000 };
        return snapshot;
      })
      .finally(() => {
        inFlight = undefined;
      });
  }
  return inFlight;
}

async function loadSnapshot(): Promise<PeopleSnapshot> {
  const response = await fetch(
    "https://randomuser.me/api/1.4/?results=5000&seed=northline&inc=name,gender,location,email,dob,registered,phone,nat,login",
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "error",
    },
  );
  if (!response.ok)
    throw new Error(`Random User returned HTTP ${response.status}.`);
  const parsed = batchSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error(
      "Random User must return a complete, valid seeded batch of 5,000 unique people.",
    );
  return {
    people: parsed.data.results,
    meta: {
      source: "randomuser",
      label: "Random User · 5,000 generated profiles",
      fetchedAt: new Date().toISOString(),
    },
  };
}
