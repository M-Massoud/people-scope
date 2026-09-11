# PeopleScope design guide

## Purpose and how to use this guide

PeopleScope is a people-data exploration dashboard built with Next.js, shadcn, and Apache ECharts. Its users should be able to spot a pattern, select it, and inspect the profiles behind it. The data consists of fictional sample profiles; the design must communicate that clearly.

The intended feel is **friendly, precise, and exploratory**. Give the interface enough personality to make discovery enjoyable while keeping charts, filters, and tables easy to understand.

This guide describes a design direction, reusable patterns, and the reasons behind them. It is not a frozen template for every future screen.

- **Requirements** protect meaning and usability: accurate data, readable content, accessible controls, honest states, and predictable navigation.
- **Defaults** provide a starting point: the palette, spacing, corner sizes, and motion timings below.
- **Flexible choices** include composition, chart-to-table proportions, accent placement, illustration, and information density. Adapt these to the task.
- When a new pattern improves the product, implement it in a reusable component or token and update this guide. Do not preserve a weak design simply because it appeared first.

## 1. Personality and visual direction

| Quality      | How it should appear                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Friendly     | Soft surfaces, helpful language, rounded controls, meaningful icons, and restrained color.            |
| Precise      | Aligned numbers, clear units, visible selection states, consistent labels, and explicit chart scales. |
| Exploratory  | Obvious clickable chart marks, contextual details, useful comparisons, and reversible filters.        |
| Professional | Clear hierarchy, consistent spacing, quiet decoration, and reliable recovery from errors.             |

Put playful details where they support the experience: a distinctive brand symbol, a larger empty-state illustration, a softly tinted summary card, or a short selection transition. Keep dense tables and filter forms visually quiet.

A future overview page can be more expressive than a detailed report. A map can occupy most of a screen. A comparison can use a balanced two-column composition. These are welcome variations within the same visual language.

## 2. Sources of truth

| Concern                                                                   | Implementation reference                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Semantic colors, typography, layout, responsive rules, CSS motion         | [globals.css](src/app/globals.css)                                 |
| shadcn configuration: Base UI, Nova style, Tailwind CSS variables, Lucide | [components.json](components.json)                                 |
| Header, navigation, brand, footer                                         | [Shell](src/components/shell.tsx)                                  |
| Summary cards and their loading state                                     | [SummaryCard and SummarySkeleton](src/components/summary-card.tsx) |
| Categorical chart palette                                                 | [Chart colors](src/components/charts/colors.ts)                    |
| Canvas lifecycle, transitions, reduced motion                             | [EChart](src/components/charts/echart.tsx)                         |
| Report charts and continent color mapping                                 | [Report options](src/modules/reports/charts/options.ts)            |
| World-map scale and selection styling                                     | [World-map options](src/modules/heatmap/charts/world-options.ts)   |
| Shared full-page fallback composition                                     | [PageFallback](src/components/page-fallback.tsx)                   |
| Provider fields and data limitations                                      | [Random User notes](docs/RANDOMUSER.md)                            |

The source files define current behavior. This guide also includes recommendations for future work; those recommendations are not claims that every capability already exists.

## 3. Color and surfaces

Use semantic tokens in UI components. The values below describe the current light design and are not an invitation to scatter hex values through JSX.

| Role                    | Current direction                    | Usage                                                  |
| ----------------------- | ------------------------------------ | ------------------------------------------------------ |
| Canvas                  | Soft blue-gray, `#f6f8fb`            | Background around the workspace.                       |
| Content surface         | White                                | Charts, forms, tables, and details.                    |
| Primary                 | Blue, `#386ee0`                      | Main action, active navigation, and selected controls. |
| Supporting accents      | Teal `#168b83`, amber `#c18424`      | Summary icons and categorical series.                  |
| Additional chart colors | Plum `#9460b5`, coral `#c66e5d`      | Distinguishable categories when needed.                |
| Main text               | Slate, `#24334b`                     | Titles, values, and primary content.                   |
| Secondary text          | `--muted-foreground`                 | Units, captions, supporting explanations.              |
| Dividers                | `--border`                           | Gentle separation of surfaces and rows.                |
| Selection               | `--accent` and `--accent-foreground` | Persistent active or selected states.                  |
| Error                   | `--destructive`                      | Actual errors and invalid fields, used sparingly.      |

White surfaces provide the main reading area. Summary cards may blend gently into a pale accent toward an edge. Reserve stronger color for a small number of meaningful elements; avoid giving every panel equal visual emphasis.

Blue represents interaction, not success. Amber in a category chart is a category, not necessarily a warning. Always explain meaning with labels, icons, or a legend.

Use borders to define ordinary panels. Use restrained shadows for elevation, with stronger separation for popovers and sheets. Do not make static cards lift on hover unless they are interactive.

Dark mode is a possible future extension. Existing dark CSS variables do not establish that the complete interface or every canvas chart has been designed and verified for dark mode.

## 4. Typography and information hierarchy

IBM Plex Sans is the shared family for UI and canvas text, configured once in `src/app/fonts.ts` using `next/font/google`. Canvas charts inherit the resolved container font through the shared EChart wrapper. These are starting sizes, not fixed limits:

| Element                        | Typical size | Treatment                                                                 |
| ------------------------------ | ------------ | ------------------------------------------------------------------------- |
| Page title                     | 25–28px      | Medium weight, slightly tight tracking.                                   |
| Full-page fallback title       | 30–36px      | More prominent, allowed to wrap naturally.                                |
| Section or chart title         | 16–18px      | Medium weight; describe the question being answered.                      |
| Summary value                  | 28–32px      | Tabular figures, clear unit, no animated counting.                        |
| Body and controls              | 13–14px      | Comfortable line height and readable contrast.                            |
| Captions and supporting labels | 11–12px      | Supplement the main information; do not hide essential instructions here. |

A useful reading order is **title → explanation → main value or chart → supporting detail → action**. Use spacing and weight to establish hierarchy before introducing more colors.

Numbers should align in tables and comparisons. Keep units next to their values, use consistent precision, and avoid changing number formats between a chart and its table. Long country names and translated labels should wrap or remain available through accessible detail, rather than disappear behind unexplained truncation.

## 5. Layout and responsive composition

Use the current 1,240px content container as the report default. It is reasonable to use more width for a dense matrix or map if that meaningfully improves exploration.

Work primarily with a 4px spacing rhythm. Useful defaults are 8px between closely related items, 12–16px within compact groups, and 20–32px between sections. Current cards use approximately 12px corners; small controls and larger illustrations can have different radii.

### Page recipes

| Page purpose           | Suggested composition                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Standard report        | Heading, filters, summary cards, chart with its table, optional record explorer.         |
| Geographic exploration | Filters, summary cards, dominant map with a country breakdown, selected-country details. |
| Comparison             | Cohort selectors, balanced cohort summaries, chart and accessible numeric comparison.    |
| Record exploration     | Search and sorting near the table, visible result count, pagination, details in a sheet. |
| Empty or error view    | Preserve useful context, explain the state, offer one obvious next step.                 |

Keep related chart and table cards aligned when side by side. The current report cards are 480px tall; this is a layout choice for those reports, not a requirement for all cards. Dense maps and matrices need their own sizing. Once panels stack, prioritize readable content over preserving desktop heights.

On narrower screens:

- Wrap summary cards and action groups without shrinking text to fit.
- Stack chart/table panels when their contents become cramped.
- Keep page-level content inside the viewport; allow purposeful scrolling within tables, matrices, and navigation.
- Use shadcn ScrollArea for bounded data regions, with visible scrollbars when content overflows.
- Keep sticky table headers opaque and above positioned row content, including avatars. Isolate the table's scroll region so its header layers stay below page overlays. Check scrolled states with loaded portraits and initials on desktop and mobile.
- Keep active navigation discoverable and interactive controls reachable.
- Allow explanatory text to wrap; treat horizontal overflow as an intentional data affordance, not a default layout strategy.

Check intermediate widths as well as phone and desktop sizes. Breakpoints should respond to the content, not device names alone.

## 6. Component patterns

### Summary cards

Use `SummaryCard` for a label, value, meaningful icon, and short explanation. Use `SummarySkeleton` for the corresponding loading state.

The value is the focal point. An icon helps recognition; a tinted surface adds personality. A detail can explain scope or provide a calculated insight, such as “Largest age band: 35–44.” Label ties and handle empty samples.

Three cards are the current report pattern, not a quota. Show the few metrics that help the user answer the page's question. Do not add filler KPIs or imply growth without a valid comparison period.

### Charts and tables

Use shadcn Card composition for the container and ECharts for the visualization. Put the title, scope, and local chart controls in the header. Keep legends, notes, and table values aligned with the chart's meaning.

A table is also an accessible interaction surface. Give selected rows a persistent state and make equivalent actions available through keyboard-operable controls.

### Forms and actions

Use the installed shadcn fields, inputs, selects, calendar/popover composition, and toggle groups. Use visible labels. A short set of view choices usually fits a ToggleGroup; a longer list fits a Select.

Use one clear primary action within a task group. Secondary actions use outline or ghost variants. Use `Button` for actions and links styled with `cn(buttonVariants(...))` for navigation. Base UI buttons enforce button semantics, so do not disguise navigation links through the Button `render` prop.

### Icons and illustrations

Use Lucide for interface icons, with consistent stroke weight and optical size. Icon-only controls need accessible names. Decorative icons should be hidden from assistive technology.

Larger illustrations are welcome in the 404, empty states, or an introductory screen. Prefer a simple map, people, or exploration motif that belongs to the product. Choose a size based on its role; the current 404's larger map-pin treatment need not appear in every error.

## 7. Charts, heatmaps, and data meaning

Choose a chart for the question:

| Question                                   | Suitable view                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| How are profiles distributed over time?    | Ordered bars by month or year.                                                                             |
| How do age groups compare?                 | Bars with a consistent baseline.                                                                           |
| How do two cohorts differ?                 | Grouped bars for precise comparison; radar as an optional shape comparison with identical axes and scales. |
| What share comes from each region?         | Doughnut with a labeled legend and numeric shares.                                                         |
| How do countries and age groups intersect? | Matrix heatmap with an explicit count or percentage mode.                                                  |
| Where are the profiles located?            | Country choropleth with a scale and accessible country table.                                              |

### Color and scale

Categorical charts use distinct colors; numerical heatmaps use an ordered scale. Keep semantic categories stable when filtering changes their order. Continents already have a fixed color mapping; extend that approach when future views need persistent category identity.

Do not use the continent palette as a numeric map scale. The world map's color represents the selected metric, not a country's continent. Distinguish no data from zero and label the active metric and units.

Explain percentage denominators: “within this country” and “of this selection” mean different things. Where a scale adapts to filters, make that behavior clear. Comparisons intended to show change need a shared or explicitly explained scale.

### Interaction and drill-down

- Give selectable marks a pointer and a clear hover state.
- Keep hover, keyboard focus, and persistent selection visually distinct.
- Show the selected country or cohort in nearby text, not color alone.
- Let users inspect the underlying profiles and reverse their selection.
- Preserve map pan/zoom when changing metrics or filters; reset only through an explicit action.
- Keep zero-result and unavailable selections understandable.

Use the records actually supplied by the provider. Registration dates describe sample profiles, not sign-ups to PeopleScope. A country choropleth does not establish real population density, user activity, or accurate person-level coordinates.

## 8. Filters, navigation, and continuity

Controls should explain when changes apply. Standard reports currently use an Apply action; heatmap filters apply immediately. Preserve that distinction in labels and feedback, or deliberately redesign the whole flow rather than change it accidentally.

- Keep draft field edits while users change another field.
- Highlight the selected date preset and chart mode.
- Keep committed view state shareable through the URL where supported.
- Make Back, Forward, refresh, and copied view links restore the expected context.
- Distinguish report filters from table-only search or sorting.
- Keep useful previous data during background updates, with a visible updating message.
- Scroll to record details only after an explicit exploration action. Loading a page or switching reports should not unexpectedly jump to the table.

## 9. Loading, empty, and error states

| State                       | Presentation                                                        | Recovery or next step                                                      |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Initial loading             | Skeletons resembling the final panels, with a loading announcement. | Keep the layout stable; avoid invented placeholder values.                 |
| Background update           | Previous results remain visible with an updating indication.        | Prevent ambiguous actions against stale data where needed.                 |
| No matching profiles        | Explain that the current filters produced no results.               | Offer a relevant filter reset.                                             |
| No sample data for a region | Neutral map treatment and explicit explanation.                     | Keep other regions and the table usable.                                   |
| Invalid filter              | Clear field or report-level explanation in calm language.           | Correct or reset the filter; retrying the same invalid input is not a fix. |
| Temporary request failure   | Preserve page context and explain the failed operation.             | Retry without losing the selected view where possible.                     |
| Unexpected page failure     | Shared branded fallback with a concise message.                     | Reload or return to the dashboard.                                         |
| Unknown route               | Clear 404 title and exploration-themed illustration.                | Return to the dashboard or open the map.                                   |

Red is useful for identifying a specific error, but an entire panel and every recovery control should not become red. Do not expose raw stack traces or internal implementation messages as user-facing copy.

## 10. Motion and feedback

Motion should communicate arrival, response, or continuity. Use it where it makes the interaction easier to follow.

| Interaction                                  | Current default                                                |
| -------------------------------------------- | -------------------------------------------------------------- |
| Page heading entrance                        | 220ms ease-out, opacity and a 5px vertical movement.           |
| Summary-card entrance                        | 280ms, with 40ms stagger increments across the three-card row. |
| Hover and selection feedback                 | Approximately 160ms.                                           |
| Bar, doughnut, and comparison-chart entrance | 320ms, cubic-out.                                              |
| Chart data update                            | 220ms, cubic-out, reusing the existing canvas.                 |
| Country-share indicator update               | 220ms width transition.                                        |
| World map and dense matrix                   | Keep bulk data animation disabled.                             |

These timings are defaults, not a reason to animate every element. New patterns such as an expanding details panel may use a short transition if they preserve focus, remain responsive, and add no avoidable layout jump.

Respect `prefers-reduced-motion` in both CSS and ECharts, including preference changes while the app is open. The result must remain understandable with motion completely disabled.

Avoid continuous decorative loops, fake count-up values, delayed access to controls, whole-page zoom effects, and animations that replay on every filter keystroke. Do not add an animation dependency for behavior that CSS or ECharts already handles well.

## 11. Accessibility and readable interaction

- Maintain a logical heading structure, main landmark, skip link, and visible keyboard focus.
- Use semantic links and buttons, labeled fields, and correct pressed/expanded/selected states.
- Give small icon controls a usable hit area and enough spacing, particularly on touch screens.
- Provide numeric data and keyboard-accessible selection alongside canvas charts.
- Do not rely on hover, color, or animation as the only way to obtain information.
- Check contrast in muted captions, chart labels, tinted cards, selected rows, and disabled controls. Subtle should not mean unreadable.
- Make validation messages and loading/update announcements available to assistive technology without repeatedly announcing an entire dashboard.
- Preserve focus when popovers close, forms validate, or detail sheets open and close.
- Verify text zoom, long content, reduced motion, and keyboard use alongside viewport checks.

These are acceptance criteria, not a claim of a completed accessibility audit.

## 12. Voice and content

Use short, concrete labels and explain scope near the data. Friendly means helpful and clear, not jokey.

| Prefer                                       | Avoid                                                             |
| -------------------------------------------- | ----------------------------------------------------------------- |
| “People in this selection”                   | “Total customers” for fictional profiles.                         |
| “Profiles by registration date”              | “Our new sign-ups.”                                               |
| “Canada accounts for 20% of this selection.” | “Canada is our best-performing market.”                           |
| “Choose valid calendar dates.”               | “Invalid payload.”                                                |
| “No profiles match these filters.”           | “No data” with no context.                                        |
| “Explore people”                             | Vague actions such as “Continue” when the destination is unclear. |

Place the fictional-data attribution and Random User documentation link once in the shared footer. Avoid repeating provider badges, fetched timestamps, and general disclaimers in every panel. Prefer concise labels, units, and legends over explanatory footnotes. Keep implementation details and methodology in the repository documentation; add visible help only when a user needs it to make a decision. Explain uncertainty, empty results, ties, and missing fields honestly.

## 13. Extending the design

New layouts, accents, interaction patterns, and visual storytelling are encouraged when they serve a clear purpose. Potential future directions include a richer overview, saved comparisons, compact density settings, or a verified dark theme. They are opportunities, not features already implemented or requirements to add now.

For a proposed extension:

1. State the user question it helps answer.
2. Pick the information hierarchy and composition that best answers it.
3. Reuse existing components and tokens where they fit.
4. Introduce a new variant or component when reuse would make the result awkward.
5. Design loading, empty, error, selected, keyboard, and mobile states together.
6. Verify it with realistic data, including long labels and empty selections.
7. Record reusable decisions here and in the implementation.

A different layout does not require a different visual language. A new visual idea does not require changing the whole app.

## 14. Review before shipping

- Can someone identify the page's purpose and next useful action quickly?
- Are the most important values prominent without competing decorations?
- Do labels, units, totals, colors, and scales tell the same story?
- Do filters, selections, history, and drill-down retain context?
- Do loading and error states provide an understandable next step?
- Are keyboard use, focus, motion preferences, and narrow layouts usable?
- Does the change reuse the chart instance and avoid unnecessary requests or heavy dependencies?
- Has the result been visually checked in the browser, not only compiled?

Match verification to the change. Pure spacing or color edits need visual checks; changes to aggregation, navigation, or selection also need relevant automated checks. Keep this guide useful by updating decisions that actually changed, rather than documenting every utility class.
