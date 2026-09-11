# Direct Random User data

User approved replacing real-estate reports with a people-data dashboard based only on API fields. Keep the existing shadcn visual style and ECharts adapter. No business-attribute generation or template assignment.

- [x] Fetch and validate 5,000 seeded Random User records (name, gender, location, email, dob, registered, phone, nat, login.uuid); retain only required fields. Cache successful batch five minutes and share in-flight requests. No automatic fabricated fallback.
- [x] Aggregate reports and paginate people on the server. Global filters: country, gender, age range, registration dates. Default full available period. Timeline year/month, age bars, age/gender bars, country doughnut. Honest sample-data provenance and metric definitions.
- [x] Update the four report routes, shared filters, URL state, tables and details Sheet. Use only supplied fields and mathematical aggregations. Preserve skeleton/error/empty states, navigation, Back, and accessible drill-down.
- [x] Remove unused real-estate providers, generated fixtures, routes and outdated current documentation. Keep explicit API-shaped fixtures under tests only.
- [x] Unit tests, production build, browser tests with intercepted API-shaped fixture, live 5,000-record smoke, desktop/mobile visual inspection, then restart preview and update the simple study guide.
