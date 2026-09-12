# API contract

## Our endpoints

- `GET /api/reports`: filters, available period/countries, provenance, metrics, timeline rows, age/gender counts, country counts. No raw people collection.
- `GET /api/people`: compact table `items`, `total`, `page`, `pageSize`, `pageCount`.
- `GET /api/people/[id]`: one full `Person`, selected by `login.uuid`. Invalid UUIDs return 400 before fetching; a valid UUID absent from the current snapshot returns 404.
- `GET /api/comparison`: `availableCountries`, `meta`, and two `groups`, each with `country`, `total`, and `ages` containing `key`, `label`, `count`, and `percentage`.
- `GET /api/heatmap`: `meta`, applied `filters`, `totalPeople`, `ageGroups`, and country `rows` with `total`, `averageAge`, and age-ordered `cells` containing `count` and `percentage`.

All are read-only Next.js route handlers and use the same Random User provider. All return no-store responses; the provider has its own in-memory batch cache. Invalid input returns 400; provider failures return 502. No local dataset is substituted.

## Report and people parameters

| Parameter          | Meaning                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `country`          | Exact `location.country` value or `all` (default)                                                                     |
| `continent`        | Optional derived location group: Africa, Asia, Europe, North America, South America, Oceania, Antarctica, or Unmapped |
| `gender`           | `male`, `female`, or `all` (default)                                                                                  |
| `ageMin`, `ageMax` | Optional inclusive integer bounds, 0–120; minimum cannot exceed maximum                                               |
| `from`, `to`       | Inclusive UTC registration dates in YYYY-MM-DD; default to full available period                                      |

Country choices come from the full loaded batch. Dates must be valid and ordered, between 1900 and 2100.

Continent filtering uses `location.country` through the lookup in `src/modules/people/geography.ts`. `/api/reports` continues returning country rows; the Geography page sums them by continent. `geography=continent|country` only chooses the browser chart/table view and does not change the API request. Zero-count continents are not added to the doughnut.

`/api/reports` also accepts `grouping=year` (default) or `grouping=month`. Empty timeline periods are retained as zero counts. Buckets are clipped to selected date boundaries.

`/api/people` also accepts:

- `search`: up to 100 characters; case-insensitive name, email, city, state or country match.
- `sort`: `registered_desc` (default), `registered_asc`, `name_asc`, `name_desc`, `age_asc`, `age_desc`. UUID breaks ties for stable pagination.
- `page`: positive integer, default 1; oversized pages clamp to the final page.
- `pageSize`: 10, 25 (default), 50, 100, or 5000. The 5,000 option returns up to the full matching sample; filters still apply. The dashboard virtualizes large table pages, while the benchmark can also render the regular table. Shared options and the default are defined in `src/config/tables.ts`, used by the selector and API validation.

Example: `/api/people?country=Canada&ageMin=25&ageMax=34&pageSize=25`.

## Comparison parameters

`/api/comparison?countryA=Canada&countryB=Germany` compares two distinct available countries. Defaults prefer Canada and Germany when present, with other available countries as fallbacks. An unavailable or duplicate selection returns 400. A batch containing fewer than two countries returns an empty `groups` array.

The comparison uses all profiles in each chosen country, regardless of report filters. Each percentage is `age group count / country total * 100`, without server-side rounding. The page rounds displayed values to one decimal place. `view=bar|radar` is browser state only and does not affect the API request.

## Heatmap parameters

`/api/heatmap?continent=Europe&gender=female` filters profiles before calculating country totals, average ages, and age-group percentages. Aggregate filters are `continent`, `gender`, and optional `band` (for example `18-24`, `75-120`, or `all`). All registration dates are included. An invalid age band returns 400. Unknown query keys are ignored. Country rows are returned alphabetically. Cells with zero people remain present, and each nonempty country row totals 100% before display rounding. No matching profiles returns `rows: []` and `totalPeople: 0`.

The page's `view`, `color`, `metric=share|count`, `order=name|size|older`, and `display=chart|table` parameters are browser-only display state. A selected country or cell adds explorer parameters such as `country`, `ageMin`, `ageMax`, and `explore=1`; those parameters filter `/api/people` without narrowing or refetching the aggregate. Changing continent, gender, or age band clears that selection and its search/page state. Each country's percentages use the filtered country total, never the global sample size. Country average age is computed from the same filtered profiles.

## Records

`src/modules/people/types.ts` describes the selected API fields. The nested shapes are preserved: `name.first`, `location.country`, `dob.age`, `registered.date`, `login.uuid`, etc. Only UUID is retained from login; passwords and hashes are stripped during validation. The table endpoint returns `PersonSummary`: `login.uuid`, name, email, gender, city/country, age, profile date, and `picture.thumbnail`. It omits state, phone, nationality, date of birth, provider ID, and the large portrait URL. Search still checks state on the server.

Opening the details Sheet calls `/api/people/[id]` for the full `Person`, including those omitted fields. React Query caches it by UUID; the Sheet shows a loading skeleton, errors, and a retry action. Full responses include `picture.large` and provider `id.name` / `id.value`. ID values may be null or empty; they are display data, not the record key.

The server lazily sorts the immutable snapshot once per requested sort order, then filters/searches that ordered collection and slices the requested page. There are at most six cached orders per snapshot; changing page or filters reuses the order, and a new provider snapshot gets fresh orders. Response field projection happens after pagination.

Totals count matching records. Average age uses supplied ages and is null for an empty selection. Country count means distinct countries in that selection. Age buckets are 0–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65–74, and 75+. Country rows contain positive counts, ordered by count descending, then name.

## Limitations

Profiles are API-generated test data. No authentication or tenant isolation is implemented. The server processes a fixed 5,000-record batch in memory; this is a practice project, not a production customer directory.
