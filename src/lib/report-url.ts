export const REPORT_KEYS = [
  "continent",
  "from",
  "to",
  "country",
  "gender",
  "ageMin",
  "ageMax",
  "grouping",
];
export const PEOPLE_KEYS = ["search", "sort", "page", "pageSize"];
export const VIEW_KEYS = [
  ...REPORT_KEYS,
  ...PEOPLE_KEYS,
  "explore",
  "geography",
];
export function selectParams(params: URLSearchParams, keys: string[]) {
  const selected = new URLSearchParams();
  for (const key of keys)
    if (params.has(key)) selected.set(key, params.get(key)!);
  return selected.toString();
}
export function patchParams(
  params: URLSearchParams,
  patch: Record<string, string | null>,
) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "" || value === "all") next.delete(key);
    else next.set(key, value);
  }
  return next;
}
