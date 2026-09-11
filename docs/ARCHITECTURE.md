# PeopleScope architecture

PeopleScope is one Next.js application organized into three feature modules. A module keeps the code for one responsibility together: its types, components, hooks, and server calculations.

```text
src/
├── app/                       Next.js pages, layout, and API routes
├── modules/
│   ├── people/                Profiles and shared people rules
│   │   ├── index.ts           Types, geography helpers, filter keys, age bands
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── geography.ts
│   │   ├── components/        People explorer and its public index
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
│   └── comparison/            Country comparison
│       ├── index.ts           ComparisonPage and comparison types
│       ├── types.ts
│       ├── components/        Comparison page and public index
│       ├── hooks/             Comparison query and public index
│       ├── charts/            Radar/bar options and public index
│       └── server/            Country age percentages and public index
├── components/
│   ├── index.ts               Shell and QueryProvider exports
│   ├── ui/                    shadcn primitives and their public index
│   ├── form-fields/           Shared labeled select and date picker
│   ├── charts/                ECharts renderer, registration, shared colors
│   ├── shell.tsx              Navigation and page frame
│   └── query-provider.tsx      Browser query cache
└── lib/                       Generic HTTP, URL, class-name helpers, public index
```

## How modules connect

The reports and comparison modules depend on the people module. People does not depend on either of them. Reports and comparison do not import each other. Shared components and generic helpers do not depend on feature modules.

Pages import a module's public entry point:

```tsx
import { ReportPage } from "@/modules/reports";

export default function Page() {
  return <ReportPage kind="registrations" />;
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
import { ageOption, registrationOption } from "../charts";
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

The people endpoint applies the same filters, then searches, sorts, and paginates. The comparison endpoint uses the same profile snapshot and calculates each country's age percentages against that country's total.

## What belongs where

- Add a shared profile field or filtering rule in `people`.
- Add a dashboard view or aggregation in `reports`.
- Change country comparison behavior in `comparison`.
- Put reusable visual controls in `components`.
- Keep route files focused on HTTP requests, responses, and status codes.

Types describe the JSON contracts. Zod validates the external profiles at runtime. The provider caches profiles on the server; React Query caches API responses in the browser. There is no database, repository abstraction, dependency injection container, or separate backend deployment.

## Validation

Unit tests cover provider validation/cache behavior, filtering, report aggregates, pagination, chart configuration, and comparison percentages. Playwright tests exercise the pages using API-shaped fixtures. The production application continues to request fictional profiles from Random User; this refactor does not introduce mock data or change the API URLs.
