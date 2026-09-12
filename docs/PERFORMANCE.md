# People table performance measurements

This experiment runs both `PeopleTable` (regular rendering) and `OptimizedPeopleTable` (virtualized rendering) in the same production build. The provider batch, query caching, fixtures, CPU settings, and timing checkpoints remain the same.

## Run the table benchmark

```bash
npm run build
npm run test:performance:table
```

The test opens its own browser, changes the row count, and records the timings automatically. You do not need to edit a browser URL or paste anything into DevTools. The command is defined in `package.json`; the test lives in `e2e/people-table-performance.spec.ts`.

Each component gets five runs at normal CPU speed and five at 6× slowdown (20 samples total). Each run prints a readable progress line. A `RESULTS` table for each component and CPU setting show the median, minimum, and maximum with rounded milliseconds or seconds, mounted rows, HTML element counts, and the time taken to complete all five runs and their checks. Durations overlap, so do not add the columns or rows together. The terminal prints the exact path to each saved JSON file. JSON results are saved under each test's folder in `test-results/` as `table-regular-1x.json`, `table-optimized-1x.json`, and their `6x` counterparts. In each file, `runs` contains every sample and `summary.updateMs` contains the median, minimum, and maximum update time in milliseconds. Another Playwright run clears this directory, so copy results you want to keep into `docs/performance/`. Both `test-results/` and JSON snapshots under `docs/performance/` are ignored by Git. Commit the benchmark code and readable findings in this document; raw measurements stay local or can be stored as CI artifacts.

A `BEFORE / AFTER` table follows each CPU setting, showing both components together, the percentage reduction in update time, and the speedup ratio. `table-comparison-1x.json` and `table-comparison-6x.json` save those comparisons. They use the freshly measured regular component, not the older saved baseline.

## The two components

- `src/modules/people/components/people-table.tsx`: the original `items.map(...)` approach; mounts every requested row.
- `src/modules/people/components/optimized-people-table.tsx`: virtualizes pages above 100 rows and preserves its regular rendering for smaller pages.

Both accept the same `items`, `busy`, and `onSelect` props. `PeopleExplorer` selects `OptimizedPeopleTable` for normal browsing. The benchmark sets an internal `regular` or `optimized` mode before loading each fresh browser context. There is no URL or user-facing switch. Both are explicitly exported from the components index and can also be swapped directly in `PeopleExplorer` during development.

The regular component is kept as an intentional, readable comparison implementation. It retains the original automatic column sizing; the optimized component uses fixed columns and row heights for stable virtual scrolling. This compares the two complete implementations, rather than trying to isolate one library call. Data fetching and timing checkpoints are shared.

## What the test records

Playwright sets an internal browser mode before loading the page. The application records these entries only when that mode is set; normal browsing does not enable recording. This preserves the same timing checkpoints used for the original baseline.

| Entry                     | Meaning                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `People table: selection` | Mark when the page-size selection handler accepts the change.                                                                                                  |
| `People table: request`   | Each people query starts through completed JSON parsing; detail records success, error, or cancellation.                                                       |
| `People table: commit`    | Selection to the updated table's layout effect, after DOM changes. Includes waiting for data; not pure React render time.                                      |
| `People table: update`    | Selection to two animation frames after the committed, non-placeholder result. This is a paint **opportunity**, not proof every pixel or portrait has painted. |

The last signal does not depend on mounting 5,000 rows, so a virtualized implementation can use the same finish line. Keep DOM-row counts as a separate metric. Returning to a fresh cached page still emits commit/update timings, but should not emit a new request. Normal browsing does not produce these custom entries. Failed or superseded page-size selections do not produce successful update timings.

## Controlled experiment conditions

This command checks recording/cache behavior and regular row rendering, then runs both components in Chromium. At each CPU setting, it runs the regular component five times followed by the optimized component five times. The server uses port 3101. It uses real production UI code with exactly 5,000 deterministic fixture profiles and blocked portraits. It does not call Random User. Each sample creates a fresh browser context, loads the 25-row page, then switches to 5,000. The 5,000-row query is uncached, while initial page code has already loaded. Browser traces/video are disabled to reduce recording overhead. Viewport is 1280×900; reduced motion is enabled consistently.

The report captures:

- Update, request, selection-to-commit, and commit-to-paint-opportunity durations.
- Response completion to commit, to separate response waiting from subsequent browser work. This includes React scheduling/rendering and other work, not only React execution.
- Tasks longer than 50ms that overlap the update interval; longest full task and total overlap duration.
- Mounted data rows and total document elements after the update.
- Verification that the last record remains reachable.

The per-component JSON attachments in Playwright's results retain every sample, browser/Node versions, conditions, and median/min/max summaries. Console output formats each run, component summary, and comparison for people; JSON keeps the original precision. The JSON `elapsedMs` field records the total time for each five-run group, including setup and checks. Normal `npm run test:e2e` runs skip the expensive benchmark but retain the timing correctness test.

Long-task duration is **not** Lighthouse Total Blocking Time or Interaction to Next Paint. The measurements do not quantify live upstream reliability, image loading, scrolling frame rate, memory, or a particular phone's speed. CPU slowdown is relative to the host machine. Automated API interception also affects transport timing, so the request column must not be presented as real network latency.

## Fair comparison after an optimization

Repeat this exact workload, machine, browser version, viewport, motion, cache, and CPU settings. Report all five samples and the median/range; do not compare different CPU settings as a before/after result. The benchmark checks that the regular component mounts 5,000 data rows while the optimized component mounts fewer than 80. Both must describe all 5,000 logical rows and keep the correct final record reachable. Spacer rows are excluded from the mounted-data-row count. The instrumentation's completion signal is unchanged.

For diagnosing a slow live run, record the row-count change in Chrome DevTools → Performance. Inspect network requests and Main-thread work. Normal browsing has no custom table timing entries. These controlled samples cannot establish why another machine took two minutes.

References: [User Timing and performance data](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data), [React layout effects](https://react.dev/reference/react/useLayoutEffect), [Chrome runtime profiling](https://developer.chrome.com/docs/devtools/performance).

## Recorded baseline — 11 September 2026

Five samples per CPU setting, using the production build and controlled conditions above. Chromium 153.0.8010.12; Node v24.18.0. This is the existing table with measurement instrumentation, before virtualization. These historical samples used the previous URL opt-in; the current automated runner enables recording internally with the same timing checkpoints.

| Metric (median)                          |     Normal CPU | 6× CPU slowdown |
| ---------------------------------------- | -------------: | --------------: |
| Selection to update signal               |       1,495 ms |        7,887 ms |
| Update range across five runs            | 1,478–1,758 ms |  7,807–8,288 ms |
| Intercepted request through JSON parsing |          81 ms |          163 ms |
| Selection to DOM commit                  |         512 ms |        2,299 ms |
| Response completion to DOM commit        |         417 ms |        2,066 ms |
| Commit to paint opportunity              |         995 ms |        5,598 ms |
| Longest overlapping main-thread task     |         734 ms |        4,294 ms |
| Total long-task overlap                  |       1,348 ms |        7,676 ms |
| Mounted data rows                        |          5,000 |           5,000 |
| Total page elements (range)              |  65,397–65,398 |   65,397–65,399 |

The original raw samples were saved locally under `docs/performance/` as `table-baseline-1x.json` and `table-baseline-6x.json`. These ignored snapshots are not included in a fresh clone; the table above preserves the recorded findings.

The browser spends most of the measured update doing work after the intercepted response finishes. Long tasks block it from responding promptly to input; the 6× samples include a single task lasting over four seconds. The original implementation rendered 5,000 rows and roughly 65,400 page elements. These historical samples establish the baseline; they do not describe the current virtualized rendering.

The large interval after DOM commit also warrants a browser trace to distinguish layout, style, effects, and painting. The timing markers alone cannot attribute that interval to one cause. No artificial busy loops or delays were added. Portraits and live API latency were excluded, so this run does not reproduce or explain the previously reported two-minute live-browser delay.

## How virtualization works

`OptimizedPeopleTable` uses TanStack Virtual for pages containing more than 100 records. It mounts the visible rows plus six extra rows on either side. Rows have a fixed 56px height and stable column widths; spacer rows keep the full scroll height. The virtualizer watches the shadcn ScrollArea viewport, with 40px reserved for the sticky header. The API still returns the same requested page of records.

Pages of 100 rows or fewer retain the regular table. Pagination therefore also provides a fully mounted alternative for assistive technology and browser find. Large virtual pages expose their logical row count and row indexes, but offscreen records are not all present in the DOM.

Tab and Shift+Tab move through records, Up/Down arrows move between adjacent rows, and Home/End move to the first/last record while a profile button is focused. Tab exits normally at the endpoints. A focused row remains mounted to preserve focus and the profile dialog's return target. Changing the data resets the table's vertical scroll. Long values in virtual rows are truncated to keep the row height stable; full values remain available in profile details.

## Virtualization results — 11 September 2026

Five samples per CPU setting, on the same host with Chromium 153.0.8010.12 and Node v24.18.0. Fixtures, viewport, reduced motion, blocked portraits, fresh contexts, and timing checkpoints match the saved baseline. Comparison uses the median of each five-run group.

| CPU setting     | Before: regular table | After: virtualized table | Less update time |
| --------------- | --------------------: | -----------------------: | ---------------: |
| Normal CPU      |                1.50 s |                   128 ms |            91.5% |
| 6× CPU slowdown |                7.89 s |                   361 ms |            95.4% |

At the measured starting position, mounted data rows dropped from 5,000 to 13. The number varies with scroll position and focused-row retention. Total page elements dropped from approximately 65,400 to 573–577 across the new samples. All 5,000 logical records remain available, and the benchmark verifies the last record's identity after scrolling.

At normal CPU speed the update range was 112–128 ms, with no overlapping tasks over 50 ms recorded. At 6× slowdown the update range was 347–403 ms and the median longest overlapping task dropped from 4,294 ms to 109 ms. This measures the defined table update and paint opportunity, not complete image loading or a field INP score. Real API requests, portraits, hardware, and other tabs can change live results.

Raw samples from the first virtualization run were saved locally as `docs/performance/table-virtualized-1x.json` and `table-virtualized-6x.json`. They are ignored by Git. The current benchmark reruns both components for a fresh comparison.

Verification: production build and type checking passed; 85 unit tests and 38 browser regression tests passed. The two expensive benchmark cases were skipped in the ordinary browser suite and then passed in the separate performance run, together with its activation/cache check (3 passed). Desktop and mobile screenshots were reviewed for the sticky header and table layout. Keyboard checks cover navigation across virtual ranges, first/last records, exiting the table, and profile-dialog focus restoration.

## Fresh comparison of both components

After separating the components, the comparison command was run with both implementations in the same build. Each median is from five samples:

| CPU setting | PeopleTable | OptimizedPeopleTable | Less update time |
| ----------- | ----------: | -------------------: | ---------------: |
| Normal CPU  |      1.49 s |               126 ms |            91.5% |
| 6× slowdown |      8.10 s |               363 ms |            95.5% |

The comparison summaries and per-component samples were saved locally in `docs/performance/paired/`, which is excluded from Git for JSON results. Run `npm run test:performance:table` to generate your own comparison; its exact output paths are printed in the terminal.

## Comparing tables after the data optimizations

Both table implementations now receive compact profile summaries. Full details load separately when a person is selected. Use the paired table benchmark to compare the regular and virtualized components within the same build; differences from older measurements can also reflect the smaller response and server sorting changes.
