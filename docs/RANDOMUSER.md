# Data source and caching

PeopleScope's only live profile provider is [Random User](https://randomuser.me/documentation). It generates fictional people; no account or API key is required. Their registration dates are sample data, not sign-ups to this application. The Profile timeline page groups those dates, and the Age & gender page compares the supplied gender values within age groups.

## Find the implementation

| Concern                    | Code                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Provider settings          | `RANDOM_USER_CONFIG` in [provider.ts](../src/modules/people/server/provider.ts)              |
| Request and validation     | `loadSnapshot` and `personSchema` in [provider.ts](../src/modules/people/server/provider.ts) |
| Server cache               | `fetchPeopleSnapshot` in [provider.ts](../src/modules/people/server/provider.ts)             |
| Retained profile shape     | `Person` in [types.ts](../src/modules/people/types.ts)                                       |
| Browser cache defaults     | [query-provider.tsx](../src/components/query-provider.tsx)                                   |
| Filter-specific query keys | [use-report-view.ts](../src/modules/reports/hooks/use-report-view.ts)                        |
| Provider regression tests  | [people-provider.test.ts](../tests/people-provider.test.ts)                                  |

## One place for provider settings

`RANDOM_USER_CONFIG` defines the API version, seed, result count, page, requested fields, cache lifetime, and timeout. The request URL, Zod batch validation, and returned metadata use these settings rather than repeating independent values.

The current request uses version `1.4`, seed `northline`, page `1`, and `5000` results. Its included field groups are:

```text
name,gender,location,email,dob,registered,phone,nat,login,picture,id
```

The URL is constructed with `URL` and `URLSearchParams`. The request has a 15-second timeout, rejects redirects, and bypasses Next.js's fetch cache with `cache: "no-store"`. Our explicit server cache is described below.

A **fixed seed** asks the generator for a repeatable sample with the same request settings and API version. `northline` is the original chosen seed; retaining it preserves the sample after the application was renamed. It is not an API key. A seed determines the generated sample; a cache avoids fetching it again. See the provider's [seed documentation](https://randomuser.me/documentation#seeds).

There is no nationality restriction. Our own API applies user-selected filters to the shared batch rather than requesting a different upstream sample for each filter.

## Requested groups versus retained fields

The `inc` parameter selects top-level groups. It does not limit `login` to UUID or `location` to country. Zod validates the response and strips nested fields outside our schema.

| Requested group | Retained fields                                         |
| --------------- | ------------------------------------------------------- |
| `name`          | `first`, `last`                                         |
| `gender`        | `male` or `female`                                      |
| `location`      | `city`, `state`, `country`                              |
| `email`         | Email string                                            |
| `dob`           | `date`, `age`                                           |
| `registered`    | `date`                                                  |
| `phone`         | Phone string                                            |
| `nat`           | Two-letter nationality code                             |
| `login`         | `uuid` only; other generated login fields are discarded |
| `picture`       | `large`, `thumbnail`                                    |
| `id`            | `name`, nullable `value`                                |

The app also retains `picture.large` and `picture.thumbnail` for avatars, and `id.name` / `id.value` for the details panel. Provider ID values can be null or empty; the UI displays “Not provided” and continues using `login.uuid` as the stable key. Avatar initials appear while a picture loads or if it fails.

The API additionally offers `cell`, plus nested fields such as street, postcode, coordinates, timezone, name title, and username. See its [response example and field options](https://randomuser.me/documentation#results).

To retain an additional field, update the requested groups if necessary, the Zod schema, and the `Person` type, then use the field in the UI. Changing `inc` alone does not make an excluded field survive validation. There is no separate mapper that invents profile fields.

The complete batch must contain the configured number of valid profiles, unique UUIDs, and matching seed/page/version metadata. A partial or malformed batch is rejected so charts do not silently describe a different sample.

## Two independent caches

| Layer                 | Stores                              | Lifetime and purpose                                                                     |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Server process        | Validated profile batch             | Five minutes; reduces calls to Random User                                               |
| Browser / React Query | Responses for individual query keys | Fresh for one minute; unused queries retained for five minutes; reduces calls to our API |

### Server cache

`fetchPeopleSnapshot` follows three rules:

1. Return `cached.snapshot` while its expiry time is in the future.
2. If `inFlight` exists, await that same pending request.
3. Otherwise call `loadSnapshot`, cache a successful result, and clear `inFlight` when the request settles.

For example, an initial request at 10:00 fetches the batch. Requests at 10:01 and 10:03 reuse it. A request at 10:06 fetches again. Expiry does not start a background request; the next consumer triggers it.

The server caches profiles, not every possible filtered aggregate. Endpoints filter and summarize that batch for their own responses. The cache is local to the process, disappears on restart, and is not shared across server instances. Once expired, failures are reported rather than silently replaced with fixtures or old results.

`cache: "no-store"` bypasses Next.js's fetch cache. It does not disable this application-owned in-memory cache.

### Browser cache

React Query identifies a response with a key such as `["reports", "country=Canada"]`. Germany has a different key. Only parameters affecting that endpoint's data belong in its key; display-only choices can reuse the existing response.

The defaults are `staleTime: 60_000`, `gcTime: 5 * 60_000`, `retry: 1`, and `refetchOnWindowFocus: false`. Stale time is a freshness window, not a polling interval. `keepPreviousData` keeps the previous result visible while a new filter or page request loads. Browser fetches receive React Query's abort signal; the shared upstream fetch has its own timeout.

The locally hosted world-boundary asset is separate from profile data. Its query uses infinite stale and garbage-collection times for the current browser application session. See [world-chart.tsx](../src/modules/heatmap/components/world-chart.tsx).

## Limits and error handling

Random User documents a maximum of **5,000 users per request**. That is a batch-size limit. As checked on 2026-09-11, its official documentation does not publish a numeric requests-per-minute quota; this should not be described as unlimited service. [Provider documentation](https://randomuser.me/documentation#multiple)

Caching reduces traffic but does not enforce a rate limit. The current app has no special `429` or `Retry-After` handling. Provider failures become an error response from our API; the browser offers retry controls. This behavior should be reviewed before relying on the public service for production traffic.

## What the values mean

Age is `dob.age`, not an age recalculated using today's date. Registration filters use `registered.date`. `fetchedAt` records when our server loaded the batch and is unrelated to a profile's registration date. Country shares and averages describe fictional sample profiles, not national population statistics. Continent is derived using the application's geographic lookup.

Test fixtures live only under `tests/fixtures`. Browser tests intercept our endpoints; production uses Random User and has no fixture fallback. The world map uses local Natural Earth boundaries for shapes, not another live profile provider.
