# PeopleScope architecture

PeopleScope is one Next.js application organized into four feature modules. A module keeps the code for one responsibility together: its types, components, hooks, and server calculations.

```text
src/
├── app/                       Next.js pages, layout, and API routes
├── config/                    Canonical page names, paths, and ID types
├── modules/
│   ├── people/                Profiles and shared people rules
│   │   ├── index.ts           Types, geography helpers, filter keys, age bands
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── geography.ts
│   │   ├── components/        People explorer and public index
│   │   ├── hooks/             Paginated people query and public index
│   │   └── server/            Provider, filtering, pagination, public index
│   ├── reports/               Four dashboard views
│   │   ├── index.ts           ReportPage and report types
│   │   ├── types.ts
│   │   ├── url-params.ts
│   │   ├── components/        Page, filters, report table, skeleton, public index
│   │   ├── hooks/             Report query, URL state, public index
│   │   ├── charts/            Report chart options and public index
│   │   └── server/            Report calculations and public index
│   ├── comparison/            Country comparison
│   │   ├── index.ts           ComparisonPage and comparison types
│   │   ├── types.ts
│   │   ├── components/        Comparison page and public index
│   │   ├── hooks/             Comparison query and public index
│   │   ├── charts/            Radar/bar options and public index
│   │   └── server/            Country age percentages and public index
│   └── heatmap/               World map and country × age matrix
│       ├── index.ts           HeatmapPage and public types
│       ├── types.ts
│       ├── components/        Page, world/matrix panels, skeleton, public index
│       ├── hooks/             Matrix query and public index
│       ├── charts/            World/matrix options, sorting, scales, public index
│       └── server/            Country counts, mean ages, age cells, public index
├── components/
│   ├── index.ts               Shell, summaries, fallbacks, QueryProvider exports
│   ├── ui/                    shadcn primitives and public index
│   ├── form-fields/           Shared labeled select and date picker
│   ├── charts/                ECharts renderer, registration, shared colors
│   ├── shell.tsx              Navigation and page frame
│   └── query-provider.tsx      Browser query cache
└── lib/                       Generic HTTP, URL, class-name helpers, public index
```

Application-wide loading/error composition stays in shared components. Next.js `not-found.tsx`, `error.tsx`, and `global-error.tsx` supply the route-level fallback entry points. The global error boundary provides its own document shell because it can replace the root layout.

## How modules connect

The reports, comparison, and heatmap modules depend on the people module. People does not depend on its consuming modules. The three visualization modules do not import each other. Shared components and generic helpers do not depend on feature modules.

Pages import a module's public entry point:

```tsx
import { ReportPage } from "@/modules/reports";

export default function Page() {
  return <ReportPage kind="profile-timeline" />;
}
```

API routes import the separate server entry point:

```ts
import { getPeopleReport } from "@/modules/reports/server";
import { InvalidFiltersError } from "@/modules/people/server";
```

The report page uses the explorer through its component entry point:

```tsx
import { PeopleExplorer } from "@/modules/people/components";
```

An `index.ts` is a short list of public exports, not another layer of logic. Imports between folders use their public indexes. Files within the same folder import siblings directly. Module internals also import their own types and constants directly instead of looping back through the module's root index. There is no single barrel combining all features and server exports, and no wildcard exports. Browser entry points never re-export server functions. The people root entry point contains only types and pure helpers, so both server and browser code can use it. Its interactive explorer has a separate component entry point.

ECharts is still loaded dynamically from its renderer file. It is not eagerly imported through a feature index.

Shared UI components also have a public index, so consumers combine their imports:

```tsx
import { Button, Card, Skeleton } from "@/components/ui";
```

Components inside `components/ui` keep direct imports of their siblings instead of importing their own index. This avoids circular dependencies. When adding a new shared UI component, add its named exports to `components/ui/index.ts`.

The same convention applies to other shared folders and feature hooks/charts:

```tsx
import { Shell } from "@/components";
import { DatePicker, LabeledSelect } from "@/components/form-fields";
import { patchParams, readJson, selectParams } from "@/lib";
import { useReportView } from "../hooks";
import { ageGroupsOption, timelineOption } from "../charts";
```

The shared chart index exports colors and types only. The renderer stays a direct dynamic import, so importing chart colors does not initialize ECharts. Next.js `page.tsx`, `layout.tsx`, and `route.ts` files retain their framework-required names; they consume module exports rather than having route-level indexes.

## Follow one request

```text
Apply country=Canada
  → report URL updates
  → reports/hooks/use-report-view.ts requests /api/reports
  → app/api/reports/route.ts calls reports/server
  → report service requests the people snapshot
  → people provider fetches Random User or reuses its five-minute cache
  → shared people filters select matching profiles
  → report service calculates totals and chart rows
  → React Query receives JSON
  → report components display the results
```

The people endpoint reuses a sorted snapshot, applies the same filters, searches, paginates, and projects only table fields. Opening the details Sheet fetches one full profile from `/api/people/[id]`. The comparison endpoint uses the same profile snapshot and calculates each country's age percentages against that country's total.

## What belongs where

- Add a shared profile field or filtering rule in `people`.
- Add a dashboard view or aggregation in `reports`.
- Change country comparison behavior in `comparison`.
- Change the world map, country/age matrix, sorting, or geographic selection in `heatmap`.
- Put reusable visual controls in `components`.
- Keep route files focused on HTTP requests, responses, and status codes.

Types describe the JSON contracts. Zod validates the external profiles at runtime. The provider caches profiles on the server; React Query caches API responses in the browser. There is no database, repository abstraction, dependency injection container, or separate backend deployment.

## Architectural decisions and tradeoffs

| Decision                                                 | Reason                                                                                                              | Tradeoff                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| One Next.js app with feature modules                     | Keep the frontend and read-only API easy to run and navigate while giving each feature an owner.                    | Boundaries are maintained through code review; they are not separate packages or enforced by a custom linter.         |
| A shared people module                                   | Reports, comparisons, and maps should agree on fields, age bands, and filtering rules.                              | Changes to shared rules require checking every consuming feature.                                                     |
| Explicit public exports and separate server entry points | Make dependencies easy to read and keep provider code out of browser imports.                                       | Barrels must stay small and avoid cycles; a folder named `server` is a convention, not a security boundary by itself. |
| Pure aggregation functions plus fetching wrappers        | Unit tests can exercise calculations with a small fixture independently of the provider.                            | Runtime validation still belongs at the external boundary; TypeScript alone does not validate JSON.                   |
| Server-side aggregates and paginated people responses    | Charts do not need all 5,000 profiles sent to the browser.                                                          | The server still filters the in-memory batch; this approach would need revisiting for a substantially larger dataset. |
| URL state plus TanStack Query                            | Views can be shared and restored; query keys separate data-changing filters from presentation changes.              | Updates must preserve unrelated parameters and normal Back/forward behavior.                                          |
| Lazily loaded ECharts and local map geometry             | Chart infrastructure supports bars, radar, doughnuts, matrices, and maps without requiring an external map service. | Canvas needs an accessible table alternative, resize handling, and lifecycle cleanup.                                 |
| Checked-in shadcn components                             | Controls can follow one design system while remaining editable project code.                                        | Upstream component updates need review against local changes.                                                         |

These choices serve a learning dashboard with a modest dataset. Add persistence, authentication, shared infrastructure, or new modules when a feature requires them; they are not prerequisites for the current read-only app.

## State, caching, and failures

| Layer           | Owns                                                                             | Lifetime / behavior                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL             | Applied filters, selected view, explorer selection, search, sort, and pagination | Survives refresh and can be shared. Each endpoint receives only its relevant parameters.                                                                                |
| Component state | Unapplied form drafts, open details, and other temporary interaction state       | Local to the mounted UI.                                                                                                                                                |
| TanStack Query  | API response cache and request status                                            | Defaults: 60-second stale time, five-minute inactive cache retention, one retry, no window-focus refetch. Existing data remains visible during supported query updates. |
| People provider | Validated Random User snapshot and shared in-flight promise                      | Five-minute cache in one server process; concurrent requests in that process share a fetch. Cold starts and other processes have independent caches.                    |
| HTTP            | Transport responses                                                              | Application APIs and the upstream fetch use `no-store`; this is separate from the explicit provider and browser caches.                                                 |

The provider validates the complete seeded batch before caching it. Invalid query parameters produce HTTP 400. Provider failures produce HTTP 502 and a retryable UI state; the app does not replace failed live data with fixtures. A valid query with no matches is a successful empty response.

Report filters narrow both aggregates and the people explorer. Comparison selectors define their own two complete country cohorts. On the heatmap, continent/gender/age-band filters change the aggregate; selecting a country or cell narrows the explorer while preserving the map or matrix context. See the [API contract](API.md) for exact parameter names.

## Extending a feature

For a new aggregate in an existing feature:

1. Describe the response in that module's `types.ts`.
2. Implement a pure calculation in `server/service.ts` and test relevant boundaries with fixtures.
3. Expose the service through `server/index.ts` and connect the route if needed.
4. Add or update the query hook using only data-changing URL parameters in its key.
5. Compose the UI from existing controls; keep ECharts options in `charts/` and include a table alternative.
6. Export only the page, types, or helpers consumed outside their implementation folder.
7. Verify behavior and update the applicable documentation using [CONTRIBUTING.md](../CONTRIBUTING.md).

Create a new module when it owns a distinct responsibility, not merely because another page or component was added.

## Validation

Unit tests cover provider validation/cache behavior, filtering, report aggregates, pagination, chart configuration, and comparison percentages. Playwright tests exercise the pages using API-shaped fixtures. The production application continues to request fictional profiles from Random User; this refactor does not introduce mock data or change the API URLs.

The heatmap module now includes `world-panel.tsx`, the dynamically loaded `world-chart.tsx`, and pure `world-options.ts`. The world renderer registers ECharts MapChart only when loaded, fetches local Natural Earth geometry from `public/maps/world.json`, and reuses the shared Canvas component. Both geographic views share `/api/heatmap`; its server aggregation adds exact average ages and supports the `band` filter. No new runtime dependency was added.

## Page names, font, and profile identity

`src/config/pages.ts` defines the canonical route path and visible title for every page. Report IDs use the same vocabulary: `profile-timeline`, `age-groups`, `age-gender`, and `geography`. The other pages are `compare-countries` and `heatmap`. Shell navigation, page headings, and metadata consume this configuration. Legacy paths exist only as redirects in `next.config.ts`, so saved URLs continue to work without maintaining two page implementations.

`src/app/fonts.ts` defines IBM Plex Sans once through `next/font/google`; the layout and global error document apply the resulting CSS variable. The chart wrapper reads its container’s computed font family, so CSS text and canvas text use the same loaded font. No Fontsource package is needed. Google font assets are fetched at build time and then served by the app.

The people schema retains portrait URLs and the provider’s nullable ID value. `PersonAvatar` composes the shadcn Avatar with an initials fallback. The people table uses thumbnails; the details Sheet uses the larger portrait and displays the provider ID when available. Neither the provider ID nor the image replaces `login.uuid` for keys or sorting.

The explorer owns its scrolling and sticky-header behavior. Its ScrollArea creates a local stacking context (`isolate`), and opaque header cells use `sticky top-0 z-10` to stay above row avatars during scrolling. This is a table layout responsibility, so the shared Avatar needs no table-specific styling. A browser regression checks the actual topmost element where an avatar passes beneath a header, with both portraits and initials at desktop and mobile widths.

### People table rendering

The shared `OptimizedPeopleTable` component owns row rendering and its shadcn ScrollArea viewport. It uses `@tanstack/react-virtual` for pages above 100 records, with fixed-height rows, spacer rows, and six-row overscan. Smaller pages render normally. UUID keys, logical ARIA row indexes, keyboard navigation, and retaining the focused trigger preserve record identity and profile-dialog focus. Fetching, filtering, sorting, and pagination remain in the existing hooks and server service. See [performance measurements](PERFORMANCE.md) for the controlled before/after workload.

`PeopleTable` retains the original full-row rendering as a readable benchmark comparison. Both components share the `items`, `busy`, and `onSelect` prop contract. `PeopleExplorer` defaults to `OptimizedPeopleTable`; only the automated benchmark selects the regular version through its internal mode. The same benchmark measures both implementations with identical data and timing checkpoints.

## Performance boundaries

- **Chart code:** `components/charts/echarts.ts` registers shared canvas, dataset, tooltip, legend, and accessibility support. Small `bar-chart`, `pie-chart`, `radar-chart`, and `heatmap-chart` modules register their own series/components and reuse `echart.tsx`. Pages dynamically import the renderer they display. The world renderer separately registers map and visual-map support. Type-only imports do not load chart implementations. Keep renderer modules out of public barrels.
- **Sorting:** `people/server/service.ts` stores at most six sorted arrays per provider snapshot in a WeakMap. Arrays copy references, not entire people. Snapshots must be treated as immutable. A replacement snapshot is a new key; old entries can be garbage-collected. Each first use sorts the full 5,000 profiles, even with a narrow filter, trading initial work and a little memory for reuse across pages and filters. A shared Intl.Collator avoids constructing locale comparison options on every name comparison. Filters and searches still run per request; this is not a cache of arbitrary URL combinations.
- **List versus details:** `PersonSummary` describes exactly what table rows display. `Person` remains the complete validated profile. `toPersonSummary` selects fields after pagination; it does not invent data. `PersonDetails` and `usePerson` own the on-demand detail request, loading/retry UI, and UUID-specific browser cache. Details are served from the same provider snapshot cache, not a separate upstream request per person. A profile missing after refresh yields a clear 404.

These boundaries leave table virtualization, shareable URLs, chart selections, and the provider validation rules intact. See `docs/PERFORMANCE.md` for the table benchmark and its limitations.
