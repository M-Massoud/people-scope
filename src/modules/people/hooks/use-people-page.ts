"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeoplePage } from "../types";
import { readJson, selectParams } from "@/lib";
import { isTableBenchmarkEnabled } from "./use-table-measurement";
import { FILTER_KEYS, PEOPLE_KEYS } from "../constants";

export function usePeoplePage(params: URLSearchParams, enabled: boolean) {
  const key = selectParams(params, [...FILTER_KEYS, ...PEOPLE_KEYS]);
  return useQuery({
    queryKey: ["people-page", key],
    queryFn: async ({ signal }) => {
      if (!isTableBenchmarkEnabled())
        return readJson<PeoplePage>(`/api/people?${key}`, signal);
      const start = performance.now();
      let status = "success";
      try {
        return await readJson<PeoplePage>(`/api/people?${key}`, signal);
      } catch (error) {
        status = signal.aborted ? "aborted" : "error";
        throw error;
      } finally {
        performance.measure("People table: request", {
          start,
          end: performance.now(),
          detail: { status },
        });
      }
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
