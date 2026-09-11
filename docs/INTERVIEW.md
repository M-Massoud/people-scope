# Five-minute walkthrough

1. Introduce the project: “A dashboard exploring API-generated sample people. I don't assign extra business fields.”
2. Show registrations, age groups, gender breakdown, and countries.
3. Select a country and age range. Refresh and use browser Back to show URL state.
4. Click a chart or table value to inspect matching people. Search, change sorting, paginate, and open details.
5. Trace one request: URL → React Query → Next.js route → provider/cache → service calculation → chart.

Be ready to explain:

- Why Zod is needed even though TypeScript types exist.
- Why chart summaries and person pages have separate API endpoints and query keys.
- Why the server caches the batch while React Query caches filtered responses.
- How loading, retries, empty results, and stale displayed data work.
- How chart init differs from `setOption` and why cleanup matters.
- Why age and registration dates are taken from the API, rather than invented.
- What would change with a database and real customers.

The useful claim is working data processing and interface behavior. This sample cannot establish real-world demographic trends.
