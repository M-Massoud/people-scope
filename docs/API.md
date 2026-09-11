# API contract

## Our endpoints

- `GET /api/reports`: filters, available period/countries, provenance, metrics, timeline rows, age/gender counts, country counts. No raw people collection.
- `GET /api/people`: `items`, `total`, `page`, `pageSize`, `pageCount`.
- `GET /api/comparison`: `availableCountries`, `meta`, and two `groups`, each with `country`, `total`, and `ages` containing `key`, `label`, `count`, and `percentage`.
- `GET /api/heatmap`: `meta`, applied `filters`, `totalPeople`, `ageGroups`, and country `rows` with `total` and age-ordered `cells` containing `count` and `percentage`.

All are read-only Next.js route handlers and use the same Random User provider. All return no-store responses; the provider has its own in-memory batch cache. Invalid input returns 400; provider failures return 502. No local dataset is substituted.

## Report and people parameters

| Parameter | Meaning |
| --- | --- |
| `country` | Exact `location.country` value or `all` (default) |
| `continent` | Optional derived location group: Africa, Asia, Europe, North America, South America, Oceania, Antarctica, or Unmapped |
| `gender` | `male`, `female`, or `all` (default) |
| `ageMin`, `ageMax` | Optional inclusive integer bounds, 0–120; minimum cannot exceed maximum |
| `from`, `to` | Inclusive UTC registration dates in YYYY-MM-DD; default to full available period |

Country choices come from the full loaded batch. Dates must be valid and ordered, between 1900 and 2100.

Continent filtering uses `location.country` through the lookup in `src/modules/people/geography.ts`. `/api/reports` continues returning country rows; the Geography page sums them by continent. `geography=continent|country` only chooses the browser chart/table view and does not change the API request. Zero-count continents are not added to the doughnut.

`/api/reports` also accepts `grouping=year` (default) or `grouping=month`. Empty timeline periods are retained as zero counts. Buckets are clipped to selected date boundaries.

`/api/people` also accepts:

- `search`: up to 100 characters; case-insensitive name, email, city, state or country match.
- `sort`: `registered_desc` (default), `registered_asc`, `name_asc`, `name_desc`, `age_asc`, `age_desc`. UUID breaks ties for stable pagination.
- `page`: positive integer, default 1; oversized pages clamp to the final page.
- `pageSize`: 10, 25 (default), 50 or 100.

Example: `/api/people?country=Canada&ageMin=25&ageMax=34&pageSize=25`.

## Comparison parameters

`/api/comparison?countryA=Canada&countryB=Germany` compares two distinct available countries. Defaults prefer Canada and Germany when present, with other available countries as fallbacks. An unavailable or duplicate selection returns 400. A batch containing fewer than two countries returns an empty `groups` array.

The comparison uses all profiles in each chosen country, regardless of report filters. Each percentage is `age group count / country total * 100`, without server-side rounding. The page rounds displayed values to one decimal place. `view=bar|radar` is browser state only and does not affect the API request.

## Heatmap parameters

`/api/heatmap?continent=Europe&gender=female` filters profiles before calculating country totals and age-group percentages. Only `continent` and `gender` affect the matrix; all registration dates and age groups are included. Unknown query keys are ignored. Country rows are returned alphabetically. Cells with zero people remain present, and each nonempty country row totals 100% before display rounding. No matching profiles returns `rows: []` and `totalPeople: 0`.

The page's `metric=share|count`, `order=name|size|older`, and `display=chart|table` parameters are browser-only display state. A selected cell adds `country`, `ageMin`, `ageMax`, and `explore=1`; those parameters filter `/api/people` without narrowing or refetching the matrix. Changing continent or gender clears that selection and its search/page state. Each country's percentages use the filtered country total, never the global sample size.

## Records

`src/modules/people/types.ts` describes the selected API fields. The nested shapes are preserved: `name.first`, `location.country`, `dob.age`, `registered.date`, `login.uuid`, etc. Only UUID is retained from login; passwords and hashes are stripped during validation.

Totals count matching records. Average age uses supplied ages and is null for an empty selection. Country count means distinct countries in that selection. Age buckets are 0–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65–74, and 75+. Country rows contain positive counts, ordered by count descending, then name.

## Limitations

Profiles are API-generated test data. No authentication or tenant isolation is implemented. The server processes a fixed 5,000-record batch in memory; this is a practice project, not a production customer directory.

World-map extension: `/api/heatmap` accepts `band` (for example `18-24`, `75-120`, or `all`). Each country row also includes `averageAge`, computed from filtered profile ages. `view`, `color`, and `order` are display-only; `country`, `ageMin`, and `ageMax` remain explorer selections and do not filter the aggregate.
