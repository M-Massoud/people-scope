# A simple guide to this project

## What did we build?

A people-data dashboard. It shows registrations over time, age groups, gender counts, countries, and an age comparison between two countries. Users can filter a report, click a chart, and inspect the matching profiles in a searchable table.

## Where does the data come from?

Random User supplies 5,000 fictional profiles. We use its name, email, phone, location, gender, age, birth date, registration date, nationality, and UUID. We do not assign extra business details. Zod keeps only the fields we use; for login, only UUID is retained.

A simple example: if the API says a person is 29 and lives in Canada, our age chart counts that record in 25–34 and our country chart counts it in Canada. We did not invent those values.

## What happens when I select Canada?

1. Select Canada and choose Apply filters. The URL gets `country=Canada`.
2. React Query asks `/api/reports?country=Canada` for data.
3. Our server gets the validated profiles from Random User or its cache.
4. The server selects Canadian profiles and calculates counts and average age.
5. The browser receives a small response and updates the chart.

Opening the explorer asks `/api/people` for one page of those records. Search, sort, and pagination apply to the table only; global filters apply to both reports and people.

## What do the folders mean?

- `app`: pages and our three API endpoints.
- `components`: the visible interface, filters, tables, charts, and shadcn components.
- `lib`: shared types, URL helpers, and React Query hooks.
- `server`: code that fetches and processes API data.
- `tests`: test code and offline fixtures, never production data.

## What do the libraries do?

- Next.js puts the frontend and API in one project.
- React builds interactive components.
- TypeScript checks code types while developing.
- Zod checks actual API JSON at runtime.
- React Query fetches responses, caches them, and tracks loading/errors.
- shadcn supplies controls, calendars, tables, skeletons, and the details Sheet.
- ECharts draws the charts.

## Why separate endpoints?

`/api/reports` returns calculated numbers. `/api/people` returns individual profiles, 25 at a time by default. We avoid sending all 5,000 profiles to the browser just to draw a chart.

`/api/comparison` returns age-group counts and percentages for two countries, from the same cached batch.

The server still loads the full batch and processes it in memory. There is no database. If records grew much larger, filtering and aggregation would move into indexed database queries.

## Why two caches?

The server caches the external batch for five minutes so filter changes do not repeatedly request 5,000 users. Concurrent requests share one fetch. React Query separately caches each filtered response in the browser. It considers responses fresh for one minute and keeps inactive responses for five minutes.

## How does the chart update?

`echart.tsx` initializes an ECharts instance once when mounted. New data goes through `setOption`, rather than destroying the chart. It listens for resizing and clicks and cleans up on unmount. Table buttons provide the same drill-down without needing to click the canvas.

## What is mocked?

The upstream service generates fictional people for testing. Our production code does not invent profile attributes or substitute local records on failure. Unit/browser tests use explicit offline fixtures so tests remain repeatable.

## How does the radar comparison work?

Choose two countries on Compare countries. The server selects the profiles for each country, counts them in our existing age groups, and divides each count by that country's total. For example, 20 people aged 25–34 out of 100 Canadian profiles becomes 20%.

The Bar and Radar buttons display those same percentages in different ways. Each radar spoke is an age group; each shape is a country. Both countries use one percentage scale, rounded up to fit the largest value, and the page states its maximum. Tooltips and the table show counts too. These are sample distributions, not quality scores or national statistics.

This page uses all ages, genders, and registration dates. Its country selections apply immediately. Countries and chart view are stored in the URL, so refresh, Back, and Copy view link preserve the comparison. Switching chart type does not fetch data again; ECharts starts a new chart instance for the new type. Country changes update the existing instance after the new response arrives.

## Where do continents come from?

Random User supplies the country, but not the continent. `src/modules/people/geography.ts` contains a small country-to-continent lookup for the provider's supported countries. Germany and France map to Europe, for example. We add their existing counts together to draw the continent doughnut. This is a geographic grouping, not an invented user attribute.

The lookup follows [UN geographic regions](https://unstats.un.org/unsd/methodology/m49/), splitting the Americas into North and South America. Turkey is grouped in Asia, Mexico in North America, and Australia/New Zealand in Oceania. An unexpected country remains counted under Unmapped until the lookup is extended.

Geography starts with Continents. Switch to Countries for more detail. Clicking a slice or its table button adds a removable continent filter to the URL; reports and the explorer then use only matching locations.

## What should I be precise about?

Age means the API's supplied age. Registered means the API's supplied registration date, not when someone used this app. Country means `location.country`; nationality is a separate field. A country percentage describes the selected sample, not the real world's population. Date filters include both selected UTC calendar dates.

## What can I say in the interview?

“I built a Next.js dashboard that fetches sample profiles from an API. The server validates, filters, and groups the data. The frontend shows charts and a paginated table, with shareable filters and loading/error handling.”
