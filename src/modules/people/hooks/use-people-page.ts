"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeoplePage } from "../types";
import { readJson, selectParams } from "@/lib";
import { FILTER_KEYS, PEOPLE_KEYS } from "../constants";

export function usePeoplePage(params: URLSearchParams, enabled: boolean) {
  const key = selectParams(params, [...FILTER_KEYS, ...PEOPLE_KEYS]);
  return useQuery({
    queryKey: ["people-page", key],
    queryFn: ({ signal }) => readJson<PeoplePage>(`/api/people?${key}`, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}
