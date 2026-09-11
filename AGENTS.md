# Working on PeopleScope

## Project context

PeopleScope is a learning and demonstration dashboard built with Next.js App Router, React, TypeScript, Apache ECharts, TanStack Query, and shadcn components based on Base UI. It explores fictional profiles from Random User. There is no database, authentication, or separate backend deployment.

Keep implementation straightforward enough to explain in an interview. Prefer small functions, explicit types, and existing patterns. Add abstractions or dependencies only when a concrete requirement justifies them.

## Read before changing code

- [README.md](README.md): setup, capabilities, and entry points.
- [Architecture](docs/ARCHITECTURE.md): module responsibilities and decisions.
- [DESIGN.md](DESIGN.md): interface, accessibility, and motion conventions.
- [API contract](docs/API.md): query parameters and response behavior.
- [Data source](docs/RANDOMUSER.md): provider configuration, retained fields, and caching.
- [CONTRIBUTING.md](CONTRIBUTING.md): development and verification workflow.

Treat source code as the evidence for current behavior. Update the relevant documentation when changing that behavior; historical verification notes are not proof that the current checkout passes.

## Module boundaries

- `src/config`: canonical page IDs, paths, and titles shared by routes and navigation.
- `src/app`: thin page entry points, layouts, fallbacks, and HTTP route handlers.
- `src/modules/people`: shared profile types, geography, provider, filtering, and people explorer.
- `src/modules/reports`: timeline, age, gender, and geography reports.
- `src/modules/comparison`: country age comparisons.
- `src/modules/heatmap`: world map, country/age matrix, and selections.
- `src/components`: reusable UI, shell, form fields, and chart infrastructure.
- `src/lib`: generic helpers without feature-specific rules.

Reports, comparison, and heatmap may depend on people. People must not depend on those modules, and the three visualization modules must not depend on one another. Shared components and helpers must not import feature modules.

Keep aggregation in feature `server/service.ts` files and chart configuration in `charts/`. Avoid moving calculations into JSX or route handlers. Separate pure calculations from fetching so they can be tested with fixtures.

Keep route paths, report identifiers, navigation labels, and page titles consistent through `src/config/pages.ts`. Use redirects for replaced URLs rather than retaining duplicate page implementations.

## Imports and exports

- Use explicit named exports in public `index.ts` files; avoid wildcard exports.
- Import across module boundaries through public entry points.
- Use shared folder exports, such as `@/components/ui` and `@/components/form-fields`.
- Use direct sibling imports inside a folder. Module internals may import their own types and constants directly to avoid circular imports through their public barrel.
- Keep server exports under `server/index.ts`. Never import or re-export them from browser code or a client-facing barrel.
- Use `import type` for type-only dependencies.
- Keep ECharts renderers as direct dynamic imports. Do not eagerly export them from the shared chart barrel; importing chart colors must not initialize ECharts.
- Preserve Next.js file conventions and their required default exports. Do not add indexes to route folders just for consistency.

## Data and interaction rules

- Keep upstream settings in `RANDOM_USER_CONFIG` in the people provider. Do not change the fixed seed as part of a brand or visual update.
- Validate external data at runtime and retain only the fields needed by the application. Never forward passwords or login hashes.
- Production requests use Random User; fixtures belong under `tests/fixtures`. Do not silently substitute local data when the provider fails.
- Preserve the shared in-flight request and process-local cache. Browser query caching is separate; API responses use `no-store`.
- Keep shareable filters and view selections in the URL. Query keys should include only parameters that change the requested data.
- Preserve refresh, Back, filter drafts, and chart-to-people drilldown behavior. Scroll to the explorer only after an explicit user action.
- Preserve clear loading, empty, validation-error, and upstream-error states. Do not treat an empty result as a failed request.

## UI conventions

- Follow `DESIGN.md` and reuse the existing shadcn/Base UI components, semantic tokens, and Lucide icons.
- Use the public UI barrel for controls. Base UI uses `render`; do not introduce Radix-specific `asChild` patterns.
- Navigation must remain a link. Use `buttonVariants` with `cn` for a link styled as a button.
- Keep paired chart/table cards and their loading states aligned. Use visible shadcn ScrollArea scrollbars for overflowing panels.
- Provide a table or keyboard-accessible alternative to canvas interactions. Respect reduced motion and preserve chart instances during updates.
- Keep copy concise. Attribute fictional Random User data and learning purposes once in the footer, linked to its documentation. Keep technical methodology in repository docs unless it is needed to use a control correctly.

## Verification and delivery

Use the change-specific checks in `CONTRIBUTING.md`. Test observable behavior and meaningful edge cases rather than duplicating implementation details. For visual changes, inspect desktop and mobile states, including loading and empty results when relevant.

Preserve unrelated working-tree changes. Do not edit generated output, commit secrets, or add a dependency without a concrete use. Include lockfile changes when dependencies change.

Before finishing, review the diff and report what changed, which checks actually ran, and any remaining limitations. Use conventional commit subjects when a commit is requested, for example `feat(heatmap): add country selection` or `docs(architecture): document module boundaries`.
