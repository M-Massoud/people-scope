"use client";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeopleReport, PeoplePage } from "./people-types";
import {
  patchParams,
  selectParams,
  REPORT_KEYS,
  PEOPLE_KEYS,
  VIEW_KEYS,
} from "./report-url";

async function read<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data;
}
export function useReportView() {
  const search = useSearchParams();
  const params = new URLSearchParams(search.toString());
  const reportKey = selectParams(params, REPORT_KEYS);
  const query = useQuery({
    queryKey: ["reports", reportKey],
    queryFn: ({ signal }) =>
      read<PeopleReport>(`/api/reports?${reportKey}`, signal),
    placeholderData: keepPreviousData,
  });
  const update = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      const url = new URL(window.location.href);
      url.search = patchParams(url.searchParams, patch).toString();
      // Next.js integrates native history with useSearchParams, without a route fetch.
      window.history[replace ? "replaceState" : "pushState"](null, "", url);
    },
    [],
  );
  const clear = useCallback(
    () => update(Object.fromEntries(VIEW_KEYS.map((key) => [key, null]))),
    [update],
  );
  return { params, query, update, clear };
}
export function usePeoplePage(params: URLSearchParams, enabled: boolean) {
  const key = selectParams(params, [
    ...REPORT_KEYS.filter((k) => k !== "grouping"),
    ...PEOPLE_KEYS,
  ]);
  return useQuery({
    queryKey: ["people-page", key],
    queryFn: ({ signal }) => read<PeoplePage>(`/api/people?${key}`, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}
