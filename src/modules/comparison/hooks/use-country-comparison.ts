"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CountryComparison } from "../types";
import { readJson, selectParams } from "@/lib";

export function useCountryComparison(queryString: string) {
  const key = selectParams(new URLSearchParams(queryString), [
    "countryA",
    "countryB",
  ]);
  return useQuery({
    queryKey: ["comparison", key],
    queryFn: ({ signal }) =>
      readJson<CountryComparison>(`/api/comparison?${key}`, signal),
    placeholderData: keepPreviousData,
  });
}
