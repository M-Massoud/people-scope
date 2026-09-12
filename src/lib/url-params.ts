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

export function updateUrlParams(
  patch: Record<string, string | null>,
  replace = false,
): void {
  const url = new URL(window.location.href);
  url.search = patchParams(url.searchParams, patch).toString();
  // Next.js integrates native history with useSearchParams, without a route fetch.
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
}
