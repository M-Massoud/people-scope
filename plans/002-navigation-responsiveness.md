# Navigation responsiveness implementation plan

**Goal:** Show navigation feedback and destination loading UI promptly, then let existing client queries and lazy charts resolve independently. Compare development and production navigation using temporary, controlled browser measurements.

**Approved design:** User asked to implement navigation responsiveness improvements and compare performance; specifically requested navigation before data loading. Keep existing data fetching in TanStack Query. No table changes or benchmark product UI.

**Baseline:** ccb65b63. Working tree clean before this task. Work in current checkout, preserving the previous sandbox fallback and the user's running development server. Do not commit or push.

## Implementation task

- [x] Add a small client NavigationLink composed with next/link and useLinkStatus. Preserve href, children, aria-current and native modifier-key/new-tab semantics. Add subtle pending indication with accessible status, without changing the link's accessible name or shifting layout. Respect reduced motion. Keep default production Link prefetching.
- [x] Add shared PageLoading composed from Shell, canonical PAGES title, and existing shadcn Skeleton/Card primitives. Shared components cannot import feature modules. Use direct sibling imports internally to avoid barrel cycles.
- [x] Add loading.tsx to the six canonical dashboard routes; each passes its page ID. Keep existing page-level query skeletons and error/retry states. Loading route UI must not await provider data or eager-load chart renderers. Do not move fetching to the server page.
- [x] Update Shell navigation links to use NavigationLink. Preserve query propagation, links, active state and scroll behavior; no optimistic fake URL navigation.
- [x] Add Playwright regressions: delayed destination route shows pending feedback; delayed data shows destination title and skeleton before resolution; nav remains usable when destination data is blocked; filters/Back/modifier links behave; no duplicate landmarks or accessible-name regressions.
- [x] Update docs/ARCHITECTURE.md with navigation phases and limitations. No extra data prefetch abstraction unless the baseline identifies a meaningful need; four reports already share query cache.

## Controller measurement and verification

- [x] Run temporary Playwright measurements against dev port 3000 and baseline production port 3102. Use fixed API fixtures with explicit delay, fresh browser contexts and identical click/heading/chart milestones. Record first sample and median across repeated samples; label compilation and prefetch effects clearly. Timing scripts/results stay outside the repository.
- [x] Repeat production measurements after the change with the same settings. Do not present fixture timings as live-provider performance or canvas insertion as completed animation/paint.
- [x] Run npm test, npm run build, npm run typecheck, npm run test:e2e and git diff --check. Restore build-generated next-env.d.ts only if changed by verification.
- [x] Inspect desktop/mobile loading and pending navigation states. Obtain fresh scoped review and address actionable issues.
- [x] Report measured values and scope of gains. No promise of literally instant uncached navigation; pending feedback and loading boundaries reduce perceived waiting, while actual resources still take time.

## Baseline measurements

Temporary browser probe; 1440×1000 Chromium, no CPU throttle, fresh browser context per sample, three samples per route. All API responses are fixed fixtures delayed800ms. Visible Link prefetch gets1000ms after initial chart canvas. Timings start at DOM click event and end at destination h1 insertion or chart canvas insertion; they do not measure completed paint/animation. No server benchmark or permanent measurement UI added.

| Route | Development heading/canvas median | Production heading/canvas median |
| --- | --- | --- |
| Geography |84 /389ms|35 /356ms|
| Compare countries |63 /1224ms|18 /1149ms|
| Heatmap |92 /1289ms|34 /1209ms|

A separate slow-route scenario holds the comparison page JS until800ms after the click (same API delay). Baseline production median:838ms to heading;1986ms to canvas. This tests route code waiting separately from data waiting. Initial routes on the running dev server may already have been compiled; this is not a cold-compilation benchmark.

## Completion and results

Completed without committing or pushing. Added the small navigation indicator and six loading boundaries; no query/prefetch service or table changes. Visual review led to removing entrance animations only from the shared route-loading heading/summary cards; normal page animation and skeleton pulse remain.

Normal production after-change medians (heading / canvas): Geography25 /346ms; Compare countries15 /1158ms; Heatmap22 /1206ms. These small differences are not presented as a robust throughput improvement.

Final rebuilt slow-route comparison, after the loading-animation correction: heading samples26,13,15ms (median15ms), canvas samples1989,1956,1982ms (median1982ms). Baseline heading838ms /canvas1986ms. The visible destination is available sooner; finishing the delayed resources remains essentially unchanged.

Verification:
- npm test:113 tests passed in12 files.
- Production build and typecheck passed, repeated after the final animation correction.
- Full browser suite:61 passed,2 opt-in timing tests skipped.
- Final scoped navigation suite rerun after the animation correction:6 passed.
- Desktop1440px and mobile390px route skeleton and pending-link screenshots inspected, no page errors or horizontal overflow in the visual probe.
- Fresh read-only review approved implementation and final animation scope.
- git diff --check passed; generated next-env.d.ts restored.
- Temporary comparison scripts, fixture responses, JSON results, and screenshots remain under /tmp; no permanent navigation benchmark or measurement UI added.
