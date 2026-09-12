"use client";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeopleReport } from "../types";
import { readJson, selectParams, updateUrlParams } from "@/lib";
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
  const update = updateUrlParams;
  const clear = useCallback(
    () => update(Object.fromEntries(VIEW_KEYS.map((key) => [key, null]))),
    [update],
  );
  return { params, query, update, clear };
}
