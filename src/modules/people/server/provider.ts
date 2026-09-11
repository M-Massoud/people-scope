import { z } from "zod";
import type { PeopleSnapshot } from "../types";

// Keep the request, validation, and cache settings together.
const RANDOM_USER_CONFIG = {
  version: "1.4",
  seed: "northline", // Preserve the existing sample despite the app's rename.
  results: 5000,
  page: 1,
  fields: [
    "name",
    "gender",
    "location",
    "email",
    "dob",
    "registered",
    "phone",
    "nat",
    "login",
    "picture",
    "id",
  ],
  cacheTtlMs: 5 * 60_000,
  timeoutMs: 15_000,
} as const;

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
  picture: z.object({
    large: z.url({ protocol: /^https$/ }),
    thumbnail: z.url({ protocol: /^https$/ }),
  }),
  id: z.object({
    name: z.string().max(200),
    value: z.string().max(200).nullable(),
  }),
});
const batchSchema = z
  .object({
    results: z.array(personSchema).length(RANDOM_USER_CONFIG.results),
    info: z.object({
      seed: z.literal(RANDOM_USER_CONFIG.seed),
      results: z.literal(RANDOM_USER_CONFIG.results),
      page: z.literal(RANDOM_USER_CONFIG.page),
      version: z.literal(RANDOM_USER_CONFIG.version),
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
        cached = {
          snapshot,
          expiresAt: Date.now() + RANDOM_USER_CONFIG.cacheTtlMs,
        };
        return snapshot;
      })
      .finally(() => {
        inFlight = undefined;
      });
  }
  return inFlight;
}

async function loadSnapshot(): Promise<PeopleSnapshot> {
  const url = new URL(
    `https://randomuser.me/api/${RANDOM_USER_CONFIG.version}/`,
  );
  url.search = new URLSearchParams({
    results: String(RANDOM_USER_CONFIG.results),
    seed: RANDOM_USER_CONFIG.seed,
    page: String(RANDOM_USER_CONFIG.page),
    inc: RANDOM_USER_CONFIG.fields.join(","),
  }).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(RANDOM_USER_CONFIG.timeoutMs),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Random User returned HTTP ${response.status}.`);
  const parsed = batchSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error(
      `Random User must return a complete, valid seeded batch of ${RANDOM_USER_CONFIG.results.toLocaleString("en-US")} unique people.`,
    );
  return {
    people: parsed.data.results,
    meta: {
      source: "randomuser",
      label: `Random User · ${RANDOM_USER_CONFIG.results.toLocaleString("en-US")} generated profiles`,
      fetchedAt: new Date().toISOString(),
    },
  };
}
