# PeopleScope — People analytics

One Next.js application that fetches 5,000 fictional profiles from Random User and explores their supplied fields. No locally assigned campaigns, budgets, lead stages, or quality scores.

| Page | Chart |
| --- | --- |
| `/` | Registrations by year or month |
| `/ages` | People by age group |
| `/demographics` | Male/female counts within age groups |
| `/countries` | Geography doughnut: continents by default, with a Countries view |
| `/comparison` | Two countries' age distributions, as bars or radar |

Global filters: country, gender, age range, and registration dates. Edit the controls, then choose Apply filters. Filters live in the URL and survive navigation, refresh and Back. Click a chart or its table alternative to inspect matching people. The explorer searches, sorts, paginates, and opens a shadcn details Sheet.

Compare countries has two immediate country selectors and Bar / Radar views. It uses all profiles in each country, with age-group percentages calculated against that country's own sample total. Both views share one scale and an exact-values table. Copy view link preserves the comparison.

Continent is derived from `location.country` using a small documented geographic lookup. It is not an extra field supplied by Random User. Clicking a continent filters reports and the people explorer; remove its filter chip to return to all continents.

## Run

Node 20.9+; verified with Node 24.

```bash
npm install
npm run dev
```

No API key, account, environment variables, or database are required. For production:

```bash
npm run build
npm run start -- --port 3100
```

## How it works

```text
Browser → our Next.js API → Random User (or five-minute cache)
                         → validate supplied fields
                         → filter and group records
Browser ← chart summaries or one page of people
```

`/api/reports` returns chart aggregates. `/api/people` returns 25 records by default. `/api/comparison` returns two countries' age-group counts and percentages. All use the same validated batch, with concurrent upstream requests shared. The browser never needs all 5,000 records to render a chart.

The application uses **API-generated test people**, not actual customers. Registration dates and ages come from the API. They are not sign-ups to this app, and ages are not recalculated using today's date. The default view includes the full available registration period. Country shares describe this sample, not population statistics.

## Stack

Next.js / React / TypeScript, shadcn/ui (Base UI), Tailwind, Apache ECharts, React Query, Zod, Vitest, Playwright.

## Architecture

The app is organized by feature. Next.js pages and API routes are small entry points into these modules:

| Module | Responsibility |
| --- | --- |
| `src/modules/people` | Profile types, Random User provider/cache, common filters, search/pagination, and People explorer |
| `src/modules/reports` | Registration, age, demographic, and geography dashboards; report filters, queries, chart options, and aggregates |
| `src/modules/comparison` | Country comparison page, query, chart options, and age percentages |

Each module exposes named exports through `index.ts`. Server functions have a separate `server/index.ts`; browser code never imports those entry points. Shared shadcn UI, form fields, the app shell, and the lazy-loaded ECharts renderer stay under `src/components`. Generic HTTP and URL helpers stay under `src/lib`.

## Read the code

1. `src/modules/people/server/provider.ts`: external request, validation, batch cache.
2. `src/modules/people/server/filters.ts`: shared filter validation and record selection.
3. `src/modules/reports/server/service.ts`: chart totals and summaries.
4. `src/modules/reports/hooks/use-report-view.ts`: URL state and browser requests.
5. `src/modules/reports/components/report-page.tsx`: chart/report composition.
6. `src/modules/people/components/people-explorer.tsx`: searchable table and details.
7. `src/components/charts/echart.tsx`: persistent chart lifecycle.

[Architecture walkthrough](docs/ARCHITECTURE.md) · [Simple study guide](docs/STUDY_GUIDE.md) · [API contract](docs/API.md) · [Data source](docs/RANDOMUSER.md) · [Interview walkthrough](docs/INTERVIEW.md) · [Verification](docs/VERIFICATION.md)

## Verify

```bash
npm test
npm run build
npm run typecheck
npm run test:e2e
```

Browser tests start a production server on port 3101. They intercept our API responses using API-shaped fixtures kept under `tests/fixtures`, so the browser suite is independent of upstream availability. Provider unit tests check external validation and caching separately. Production has no fixture mode or automatic fallback.
