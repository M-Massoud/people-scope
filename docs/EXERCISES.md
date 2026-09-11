# Practice exercises

1. Filter Canada and predict which report totals change. Then search one person's name and explain why only the explorer changes.
2. Follow `country=Canada` through `use-report-view.ts`, the route handler, and `src/modules/reports/server/service.ts`.
3. Inspect `src/modules/people/server/provider.ts`: identify the request, JSON validation, and five-minute cache. Find where extra login fields are removed.
4. Inspect `src/modules/reports/charts/options.ts`: find how a row's count is connected to a bar. Then find how a click changes the URL.
5. Filter ages 20–30 and select the 18–24 group. Explain why the explorer keeps the intersection 20–24.
6. Test an invalid age range, no search matches, and an upstream failure. Explain the different responses.
7. Use browser Network tools to compare `/api/reports` and `/api/people?pageSize=25`. Explain why the browser doesn't need every profile at once.
