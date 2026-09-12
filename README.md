# PeopleScope — People analytics

One Next.js application that fetches 5,000 fictional profiles from Random User and explores their supplied fields. No locally assigned campaigns, budgets, lead stages, or quality scores.

| Page                 | Chart                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `/profile-timeline`  | Profile timeline: profiles by registration year or month                                       |
| `/age-groups`        | People by age group                                                                            |
| `/age-gender`        | Age & gender: male/female counts within age groups                                             |
| `/geography`         | Geography doughnut: continents by default, with a Countries view                               |
| `/compare-countries` | Two countries' age distributions, as bars or radar                                             |
| `/heatmap`           | World map and country × age matrix with counts, within-country percentages, and cell drilldown |

Global filters: country, gender, age range, and registration dates. Edit the controls, then choose Apply filters. Filters live in the URL and survive navigation, refresh and Back. Click a chart or its table alternative to inspect matching people. The explorer searches, sorts, paginates, and opens a shadcn details Sheet.

Compare countries has two immediate country selectors and Bar / Radar views. It uses all profiles in each country, with age-group percentages calculated against that country's own sample total. Both views share one scale and an exact-values table. Copy view link preserves the comparison.

Continent is derived from `location.country` using a small documented geographic lookup. It is not an extra field supplied by Random User. Clicking a continent filters reports and the people explorer; remove its filter chip to return to all continents.

The heatmap page offers an interactive world map and a country-by-age matrix. Color countries by user count or average age, or compare age groups using counts and within-country percentages. Both views share continent, gender, and age-group filters. Select a country, matrix cell, or keyboard-accessible table value to explore matching profiles. Display changes and selections reuse the current response. The world map loads public-domain Natural Earth boundaries locally and supports zooming, panning, and resetting the view.

Canonical paths and labels live in [src/config/pages.ts](src/config/pages.ts). Navigation, headings, metadata, and report IDs use these definitions. The homepage and former routes redirect to their canonical replacements while preserving query parameters.

## Run

Node 20.9+; verified with Node 24.

```bash
npm install
npm run dev
```

No API key, account, environment variables, or database are required. IBM Plex Sans loads through Next.js `next/font/google`; the first build needs network access to Google Fonts, and built fonts are served locally to visitors. For production:

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

`/api/reports` returns chart aggregates. `/api/people` returns 25 compact table records by default; `/api/people/[id]` returns the full profile when its details are opened. `/api/comparison` returns two countries' age-group counts and percentages. `/api/heatmap` returns country counts, average ages, and the country/age matrix. All use the same validated batch, with concurrent upstream requests shared. The browser never needs all 5,000 records to render a chart.

Provider settings live together in `RANDOM_USER_CONFIG` at the top of [provider.ts](src/modules/people/server/provider.ts). The [data-source guide](docs/RANDOMUSER.md) explains the seed, requested versus retained fields, both caches, and provider limits.

The application uses **API-generated test people**, not actual customers. Registration dates and ages come from the API. They are not sign-ups to this app, and ages are not recalculated using today's date. The default view includes the full available registration period. Country shares describe this sample, not population statistics.

## Stack

| Technology                   | Package / location                                                           | Role                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Next.js, React, TypeScript   | `next`, `react`, `typescript`                                                | Pages, API routes, components, and compile-time checks |
| Apache ECharts               | `echarts`; [chart setup](src/components/charts/echarts.ts)                   | Canvas charts and geographic maps                      |
| React Query (TanStack Query) | `@tanstack/react-query`; [query provider](src/components/query-provider.tsx) | Browser requests, query caching, and retries           |
| Zod                          | `zod`; [data provider](src/modules/people/server/provider.ts)                | Runtime validation of the external response            |
| shadcn/ui, Base UI, Tailwind | [UI components](src/components/ui), `@base-ui/react`, `tailwindcss`          | Shared controls, accessible primitives, and styling    |
| Vitest, Playwright           | `vitest`, `@playwright/test`                                                 | Unit and browser tests                                 |

Apache ECharts is published as `echarts` on npm. shadcn supplies our interface controls; ECharts renders the charts. The manifest declares compatible version ranges, while `package-lock.json` records exact resolved versions.

## Architecture

The app is organized by feature. Next.js pages and API routes are small entry points into these modules:

Contributor workflow lives in [CONTRIBUTING.md](CONTRIBUTING.md). Coding-assistant instructions live in [AGENTS.md](AGENTS.md); architecture decisions and boundaries are documented in the [architecture guide](docs/ARCHITECTURE.md).

| Module                   | Responsibility                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/modules/people`     | Profile types, Random User provider/cache, common filters, search/pagination, and People explorer                |
| `src/modules/reports`    | Registration, age, demographic, and geography dashboards; report filters, queries, chart options, and aggregates |
| `src/modules/comparison` | Country comparison page, query, chart options, and age percentages                                               |
| `src/modules/heatmap`    | Interactive world map, country/age matrix, aggregation, filtering, and profile drilldown                         |

Each module exposes named exports through `index.ts`. Server functions have a separate `server/index.ts`; browser code never imports those entry points. Shared shadcn UI, form fields, the app shell, and the lazy-loaded ECharts renderer stay under `src/components`. Generic HTTP and URL helpers stay under `src/lib`.

## Read the code

New to charts? Open [Charts, finally explained](docs/charts-guide.html) for interactive bar, doughnut, radar, matrix, and world-map lessons with small code examples. The standalone HTML guide works offline.

Start with the [interactive dashboard guide](docs/dashboard-guide.html) for a beginner-friendly explanation of the architecture, data flow, caching, chart calculations, and technical review questions. Open the HTML file in a browser; the diagrams work offline, and the source links work when it stays in this repository.

1. [Data provider](src/modules/people/server/provider.ts): `RANDOM_USER_CONFIG`, request construction, validation, and batch caching.
2. `src/modules/people/server/filters.ts`: shared filter validation and record selection.
3. `src/modules/reports/server/service.ts`: chart totals and summaries.
4. `src/modules/reports/hooks/use-report-view.ts`: URL state and browser requests.
5. `src/modules/reports/components/report-page.tsx`: chart/report composition.
6. `src/modules/people/components/people-explorer.tsx`: searchable table and details.
7. `src/components/charts/echart.tsx`: persistent chart lifecycle.

[Design guide](DESIGN.md) · [Architecture walkthrough](docs/ARCHITECTURE.md) · [Simple study guide](docs/STUDY_GUIDE.md) · [API contract](docs/API.md) · [Data source](docs/RANDOMUSER.md) · [Verification](docs/VERIFICATION.md)

## Verify

```bash
npm test
npm run build
npm run typecheck
npm run test:e2e
```

Browser tests start a production server on port 3101. They intercept our API responses using API-shaped fixtures kept under `tests/fixtures`, so the browser suite is independent of upstream availability. Provider unit tests check external validation and caching separately. Production has no fixture mode or automatic fallback.

For the automated 5,000-row comparison of `PeopleTable` and `OptimizedPeopleTable`, see [performance measurements](docs/PERFORMANCE.md). Run `npm run test:performance:table` after a production build. Results appear in the terminal and as JSON files under `test-results/`; no browser setup is needed.

Large people-table pages use TanStack Virtual to render a small window of rows while keeping every requested record available through scrolling. Pages of 100 rows or fewer render in full.
