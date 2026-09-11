// One vocabulary for route paths, navigation, page headings, and report IDs.
export const REPORT_PAGES = {
  "profile-timeline": { href: "/profile-timeline", title: "Profile timeline" },
  "age-groups": { href: "/age-groups", title: "Age groups" },
  "age-gender": { href: "/age-gender", title: "Age & gender" },
  geography: { href: "/geography", title: "Geography" },
} as const;

export const PAGES = {
  ...REPORT_PAGES,
  "compare-countries": {
    href: "/compare-countries",
    title: "Compare countries",
  },
  heatmap: { href: "/heatmap", title: "Heatmap" },
} as const;

export type ReportPageId = keyof typeof REPORT_PAGES;
export type PageId = keyof typeof PAGES;
