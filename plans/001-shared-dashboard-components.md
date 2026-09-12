# Shared dashboard components implementation plan

> For agentic workers: use subagent-driven-development or executing-plans to implement the tasks below. Preserve the existing application behavior and verify the final integration.

**Goal:** Complete the seven approved cleanup items while making the dashboard easier to maintain and explain.

**Architecture:** Keep the four feature modules, explicit public exports, server-only entry points, and lazy chart renderers. Extract repeated UI behavior into small controlled components; share HTTP and URL mechanics without creating a generic dashboard, query, or route framework.

**Tech stack:** Next.js App Router, React, TypeScript, Base UI/shadcn, TanStack Query, Apache ECharts, Vitest and Playwright. No new dependencies.

**Spec:** The seven numbered tasks below record the approved scope. The user requested all seven and a written plan before execution.

**Planned at:** `dbca737c`, 2026-09-12. Check `git diff --stat dbca737c..HEAD -- src tests e2e` before execution and reconcile any intervening changes.

## Constraints and verification

- Read `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `DESIGN.md`, `docs/API.md`, `docs/RANDOMUSER.md`, and `CONTRIBUTING.md`.
- Keep imports through existing public indexes. Internal siblings may import directly. Shared UI must not import feature modules.
- Use the installed shadcn components from `@/components/ui`; Base UI uses `render`, not `asChild`.
- Preserve query keys, abort signals, provider caching, response shapes, sorting, pagination, UUID details, and both benchmark tables.
- Preserve native history push/replace, hash and unrelated parameters, comparison default countries, heatmap display defaults, Back/refresh, and explicit-only explorer scrolling.
- Preserve all age-band API keys. In particular, the displayed/API key `75+` and the URL filter `band=75-120` are intentionally different.
- No changes to dependencies, chart registrations, chart lifecycle, map assets, ignored study guides, generated files, or benchmark machinery. No commit or push is requested.
- Start with focused characterization tests for behavior being moved. Add red-first tests for changed feedback behavior. Do not add tests which merely mirror implementation details.
- Final commands: `npm test`, `npm run build`, `npm run typecheck`, `npm run test:e2e`, and `git diff --check`. All must exit 0. The two opt-in table timing runs remain skipped in the normal browser suite.
- Production browser checks use port 3101 and fixtures; inspect desktop/mobile views, clipboard failure, single selection, and retry states.

## Execution groups

1. UI/navigation: tasks 1, 2, 4, 5 share page files; implement them together with sequential edits.
2. Data/HTTP: tasks 3, 6, 7 are independent of UI/navigation, except the age-selector migration in `heatmap-page.tsx`; the UI implementer owns that one migration using the interface specified in task 7.
3. Review the combined diff, update architecture/API documentation, run final verification, and record results here.

## Task 1: Shared CopyViewLink

**Files:** create `src/components/copy-view-link.tsx`; export from `src/components/index.ts`; update report, comparison, and heatmap page components. Add `e2e/shared-controls.spec.ts` for cross-page interactions.

**Current state:** `report-page.tsx:288`, `comparison-page.tsx:148`, and `heatmap-page.tsx:220` independently use `navigator.clipboard.writeText`, success state, and failure messages.

**Interface:**

```ts
type CopyViewLinkProps = {
  viewKey: string;
  getUrl?: () => string;
};
```

- [x] Add browser checks for copying a current report URL; copying resolved default comparison countries; permission failure; and feedback clearing when the view changes.
- [x] The component owns its button, link/check icon, and `role="status"` success/error feedback. Default `getUrl` reads `window.location.href` only inside the click handler. Record feedback against the captured `viewKey` so an old asynchronous copy cannot mark a new view copied.
- [x] Keep comparison URL construction in its page: serialize resolved `countryA`, `countryB`, and `view` as today. Pass a view key containing those values and current parameters. Report keys include report kind and query string.
- [x] Remove local clipboard state and manual copy-feedback resets from the three pages. Do not add an application-wide clipboard context or hook layer.

Example caller:

```tsx
<CopyViewLink viewKey={`${kind}?${params.toString()}`} />
```

**Verify:** clipboard tests in `e2e/shared-controls.spec.ts` pass on a fresh build; source search finds clipboard writes only in the shared component.

## Task 2: Controlled SingleChoiceToggle

**Files:** create `src/components/form-fields/single-choice-toggle.tsx`; export from that folder's index; update report-page, comparison-page, heatmap-page, heatmap-panel, world-panel.

**Current state:** seven controls repeat `value={[value]}` and `if (values.length) onChange(values[0])` around ToggleGroup.

**Interface:**

```ts
type SingleChoiceToggleProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  variant?: "default" | "outline";
  spacing?: number;
};
```

- [x] Characterize that clicking the selected chart mode leaves it selected and keyboard navigation changes modes correctly without losing filters.
- [x] Compose ToggleGroup and ToggleGroupItem, using size `sm` and preserving the supplied variant/spacing. Match returned values against options before invoking the scalar callback; ignore empty selections.
- [x] Replace the seven chart/view controls. Keep each caller's URL patches and drilldown reset behavior local.
- [x] Leave the date-preset ToggleGroup in `reports/components/filters.tsx` intact: custom dates intentionally allow no active preset.

Example:

```tsx
<SingleChoiceToggle label="Map color" value={metric}
  options={[{ value: "count", label: "User count" }, { value: "age", label: "Average age" }]}
  onChange={onMetric} />
```

**Verify:** shared-control and existing comparison, heatmap, world-map, report tests pass; mode changes preserve the chart canvas where already supported.

## Task 3: Reuse readJson in the comparison query

**Files:** `src/modules/comparison/hooks/use-country-comparison.ts`; only add HTTP tests if existing coverage leaves a material gap.

**Current state:** the hook repeats fetch/JSON/error handling already implemented by `src/lib/http.ts`.

- [x] Retain the `["comparison", key]` query key, parameter whitelist, and `keepPreviousData`.
- [x] Replace its inline fetch block with the existing helper:

```ts
queryFn: ({ signal }) => readJson<CountryComparison>(`/api/comparison?${key}`, signal)
```

- [x] Preserve server-provided errors; accept the existing helper's generic fallback when no error message is supplied. Do not build a generic query factory.

**Verify:** comparison error/retry and switching browser tests pass; `npm run typecheck` exits 0 after build.

## Task 4: Share browser URL updates

**Files:** `src/lib/url-params.ts`, `src/lib/index.ts`, `src/modules/reports/hooks/use-report-view.ts`, comparison-page, heatmap-page; create `tests/url-params.test.ts`.

**Interface:**

```ts
export function updateUrlParams(patch: Record<string, string | null>, replace = false): void;
```

- [x] Test real URL composition with a stubbed browser history: unrelated query keys, hash, null/empty/all deletion, encoded country values, push by default, replace when requested. Assert the URL/history method outcome rather than how many helpers were called.
- [x] Move the repeated operation into this function; access browser globals only when called:

```ts
const url = new URL(window.location.href);
url.search = patchParams(url.searchParams, patch).toString();
window.history[replace ? "replaceState" : "pushState"](null, "", url);
```

- [x] Use it from all three consumers. Keep the report callback stable with useCallback if necessary. Heatmap still applies `{ view, ...patch }`; report reset key lists and comparison reset paths remain feature-owned.
- [x] Remove copied URL-operation blocks and the obsolete copy-state reset coupling after task 1.

**Verify:** `npm test -- tests/url-params.test.ts`; existing Back, refresh, filter-draft, and explorer-scroll Playwright checks pass.

## Task 5: Shared RequestError

**Files:** create `src/components/request-error.tsx`; export from `src/components/index.ts`; update report-page, comparison-page, heatmap-page, world-chart. Optionally migrate the identical person-details retry block if it fits without extra API knobs.

**Interface:**

```ts
type RequestErrorProps = {
  message?: string | null;
  onRetry: () => void;
  retrying: boolean;
  retryLabel?: string;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
};
```

- [x] Add a delayed-retry browser case proving the retry button becomes disabled, announces `Retrying…`, and restores normal content when the request resolves.
- [x] Compose Alert, optional AlertTitle, AlertDescription, Button and RotateCw. Reuse semantic styles; keep the panel calm and responsive. The component accepts state and callbacks; it never imports TanStack Query or decides whether old data stays visible.
- [x] Mount the component even when there is no error; it renders the caller's optional fallback then. Pass initial pending skeletons as that fallback. Retain its last error only while `retrying` so TanStack clearing `error` during a retry does not remove pending feedback. Clear the retained error after success; key it to the request identity so a new filter does not reuse an old error. Keep this behavior inside the shared component rather than duplicating retention state in every page.
- [x] Pass `retrying={query.isFetching}` (or the geometry query state). Keep reset controls as caller-provided actions, retaining their existing labels and effects.
- [x] For map-asset errors, keep the country table available and retain the explanation that people can still be explored. Do not gate the whole page on map loading.
- [x] Replace repeated retry markup. Preserve the report error title and accessible heading if supplied; preserve each retry button's normal label.

**Verify:** `e2e/shared-controls.spec.ts`, `e2e/fallbacks.spec.ts`, `e2e/world-map.spec.ts`, and retry tests for reports/comparison/heatmap pass. Inspect desktop and mobile screenshots of error state and retrying state.

## Task 6: Shared API response policy

**Files:** create `src/app/api/_lib/responses.ts`; update reports, people, comparison, heatmap, and people/[id] route handlers; create `tests/api-responses.test.ts` or route contract tests under `tests/`.

**Interfaces:**

```ts
export function jsonResponse(data: unknown, status?: number): NextResponse;
export function errorResponse(error: unknown, fallbackMessage?: string): NextResponse;
```

- [x] Test no-store on success/error, InvalidFiltersError → 400 with its message, unknown error → 502 without private details, and a preserved profile 404. Existing `tests/person-details.test.ts` already checks the detail contract.
- [x] Keep the helper API-local, because recognizing `InvalidFiltersError` depends on the people module. It must not be exported from browser-facing `src/lib` or shared components.
- [x] `jsonResponse` sets `Cache-Control: no-store`; `errorResponse` uses it with status 400 or 502 and the existing default message. Each handler keeps its explicit GET, force-dynamic export, try/catch, and service call.
- [x] Detail GET keeps its special not-found message/status and passes its current profile-specific fallback to `errorResponse`. Do not create a route factory or move feature services into HTTP infrastructure.

**Verify:** `npm test -- tests/api-responses.test.ts tests/person-details.test.ts`; route error contract checks must retain current status/body/headers.

## Task 7: Canonical age-band descriptors

**Files:** `src/modules/people/constants.ts`; report/comparison/heatmap server services; age selector in heatmap-page (owned by the UI implementer); create `tests/age-bands.test.ts` if existing aggregation tests do not cover boundaries sufficiently.

**Interface:** keep the public name `ageBands`, but replace tuples with readonly descriptors:

```ts
{ min: 75, max: 120, key: "75+", label: "75+", filterValue: "75-120" }
```

The other seven descriptors preserve ranges 0–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65–74; keys/filterValue use a hyphen, displayed labels use an en dash.

- [x] Characterize age boundaries 0, 17, 18, 74, 75, 120 across report, comparison, and heatmap outputs, and heatmap `band=75-120` filtering. Check totals/percentages and existing JSON keys; do not test only a copied constant array.
- [x] Define descriptors once; consumers destructure `{ min, max, key, label }`. Mutable counters are created per request, never attached to shared descriptors.
- [x] Match the heatmap filter by `filterValue`; preserve returned heatmap ageGroups shape `{ key, label, min, max }` without adding filterValue to the public API response.
- [x] Heatmap selector uses `{ value: band.filterValue, label: `${band.label} years` }`. All counting, percentages, country sorting, and original data stay in their feature services.
- [x] Remove duplicated `min === 75` and label-building logic from those consumers.

**Verify:** all report/comparison/heatmap unit tests and the new boundary coverage pass; existing heatmap selection/URL browser tests pass.

## Final review and delivery

- [x] Review each group against its task interfaces and constraints, then review the whole diff with fresh eyes.
- [x] Update `docs/ARCHITECTURE.md` to locate the three components, URL helper, API response helper, and canonical age descriptors. Update `docs/API.md` only to clarify ownership; do not claim a changed wire contract.
- [x] Run the full verification sequence above. Restore only generated changes introduced by verification; preserve user changes.
- [x] Confirm clipboard calls and repeated toggle adapters are consolidated, legacy date presets remain, and no generic framework or new package was added.
- [x] Inspect affected desktop/mobile states, record actual verification below, and return the changes uncommitted.

## Execution record

Status: complete.

- UI/navigation tasks 1, 2, 4, 5: completed with one owner because page files overlap.
- Data/HTTP tasks 3, 6, 7: completed with a separate owner. The UI owner migrates the heatmap age selector to the agreed descriptor interface.
- Preflight: task 1 removes copy-state resets used beside task 4 URL updates; both have the same owner. Task 2 chart controls and task 5 error panels share page files; both have the same owner. Task 7 produces the exact descriptors consumed by the UI owner. The other interfaces are independent.
- Ruling: use the current checkout after the attempted detached worktree creation was blocked by sandbox write restrictions. No commit or branch movement will be performed.
- Ruling: RequestError accepts an optional current message and retains it internally only during retry. TanStack clears the error while refetching, so leaving every panel behind `isError` would prevent the approved disabled/pending retry state. Regression tests must prove pending visibility and clearing after success/navigation.
- Review correction: pending skeletons must depend on actual retained feedback, not `errorUpdatedAt`, which persists when revisiting a failed cached request. RequestError receives an optional caller-composed fallback so a new instance can show loading while an existing retry retains its message. Keep live status outside the retry button so the visible label remains its accessible name. Suppress the report updating banner while showing a failed background request's retry state.
- Table scope: PeopleExplorer already centralizes search, sorting, pagination, and profile details for all consuming pages. Preserve it and both regular/virtualized renderers; do not add a second generic table system during this refactor.

### Final verification

- `npm test`: 113 tests passed across 12 files.
- `npm run build` and `npm run typecheck`: passed.
- `npm run test:e2e`: 57 passed; 2 opt-in table performance tests skipped. Includes 17 new shared-control regression tests.
- Desktop and mobile screenshots inspected; clipboard feedback and disabled retry state verified, with no page errors or horizontal overflow in the fixture browser check.
- Fresh reviews approved the data and UI changes after retry-state corrections.
- `git diff --check`: passed. Build-generated `next-env.d.ts` restored. No dependencies added; changes remain uncommitted.
