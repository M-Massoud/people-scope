import { FILTER_KEYS, PEOPLE_KEYS } from "@/modules/people";

export const REPORT_KEYS = [...FILTER_KEYS, "grouping"];
export const VIEW_KEYS = [
  ...REPORT_KEYS,
  ...PEOPLE_KEYS,
  "explore",
  "geography",
];
