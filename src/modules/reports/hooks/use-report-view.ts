"use client";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeopleReport } from "../types";
import { patchParams, readJson, selectParams } from "@/lib";
import { REPORT_KEYS, VIEW_KEYS } from "../url-params";

export function useReportView() {
  const search = useSearchParams();
  const params = new URLSearchParams(search.toString());
  const reportKey = selectParams(params, REPORT_KEYS);
  const query = useQuery({
    queryKey: ["reports", reportKey],
    queryFn: ({ signal }) =>
      readJson<PeopleReport>(`/api/reports?${reportKey}`, signal),
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
