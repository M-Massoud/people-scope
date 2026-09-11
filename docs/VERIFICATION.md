# Verification — direct Random User dashboard

Verified September 11, 2026 with Node 24, Next.js 16, and Chromium.

- 67 unit tests passed: provider validation, 5,000-record completeness, UUID uniqueness, extra-field stripping, in-flight sharing, cache expiry, failure recovery, report aggregates, dates, age bands, filtering, pagination, sorting, API error boundaries, chart options, country comparison denominators and validation, continent grouping, and continent-filtered reports/people.
- 17 browser tests passed against API-shaped fixtures: all four reports, URL refresh/navigation/Back, persistent canvas, age validation, date presets, registration drilldown, search/sort/pagination, details/focus return, country/demographic drills, actual canvas clicks, skeleton/error retry, empty results, calendar year selection, mobile width, preserved form drafts, navigation scroll behavior, equal card heights, visible/draggable shadcn scrollbars, country comparison views/selections/loading/error recovery, and continent drills.
- Production build (`npm run build -- --webpack`) and TypeScript check passed.
- Live `/api/reports` returned 5,000 people across 21 countries, average supplied age 53.2036, registration dates 2002-03-23 through 2022-05-23.
- Live `/api/people?pageSize=25` returned 25 records and total 5,000. The retained login object contained UUID only.
- All four live charts and the details panel rendered without browser errors. Desktop reports/details and a 390px mobile demographic chart were visually inspected; document width matched viewport width.

Production has no local sample mode or automatic fixture fallback. Random User itself generates fictional profiles. Test fixtures live only under `tests/fixtures` and are intercepted by browser tests; their 60-record totals intentionally differ from the live 5,000-record batch.

The earlier real-estate implementation, local attribute assignment, alternative providers, market reference, and lifecycle lab were removed as part of the approved change in scope. The study guide and API documentation describe the current implementation.

## Navigation scroll correction

Removed the explorer's mount-time scroll effect. Opening a URL or navigating with `explore=1` now preserves normal page scrolling; explicit Explore people and chart/table drill-down actions still scroll to the records. Added a browser regression for page load, navigation, and explicit opening.

## Report layout and scrolling

Chart and report-data cards share a 480px height across all four reports, including their loading skeletons. Charts fill their available space, while long report tables scroll inside the card. Report tables, the people table, and profile details use shadcn ScrollArea. Overflowing content has visible scrollbars; wide tables also have a horizontal scrollbar. Browser checks cover keyboard scrolling, horizontal thumb dragging, and mobile page width. Live desktop measurements confirmed matching 480px cards on all four pages with no browser errors.

## Country comparison and continents

The production build and browser suite passed after adding `/comparison` and the Geography view. The comparison browser checks cover Radar/Bar switching without another data request, distinct country selectors, refresh/Back, aligned skeletons, invalid-country reset, and mobile overflow. Live screenshots of desktop radar, desktop bars, mobile radar, and the continent doughnut were inspected; no browser errors occurred.

The live comparison returned Canada (240 profiles) and Germany (243 profiles), each summing to 100% within floating-point precision. Duplicate country parameters returned HTTP 400. The continent table accounted for all 5,000 profiles: Europe 2,851, Asia 734, North America 711, Oceania 486, and South America 218. No sample country was unmapped.

## Repository cleanup

Removed obsolete revenue/market/lab styles and consolidated the current layout rules. Removed the unused native select, chart debug counters/output, unused line-chart registration, direct `date-fns` dependency, empty environment template, and five superseded revenue/real-estate planning documents. `date-fns` remains a transitive calendar dependency. The current study guide and API documentation are retained.

Scripts now use `next dev`, `next build --webpack`, and `next start`; the README uses plain `npm run build`. The canvas-preservation test checks the original DOM element directly instead of relying on production debug counters.

After cleanup, all 67 unit tests, all 17 browser tests, the production build, and TypeScript with `--noUnusedLocals --noUnusedParameters` passed. An import-graph scan found no unreachable source files. Before/after measurements of the shell, filters, cards, charts, and text styling matched across all five pages at 1440px and 390px widths. Live browser checks reported no errors.
