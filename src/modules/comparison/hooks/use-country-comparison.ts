"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CountryComparison } from "../types";
import { selectParams } from "@/lib";

export function useCountryComparison(queryString: string) {
  const key = selectParams(new URLSearchParams(queryString), [
    "countryA",
    "countryB",
  ]);
  return useQuery({
    queryKey: ["comparison", key],
    queryFn: async ({ signal }): Promise<CountryComparison> => {
      const response = await fetch(`/api/comparison?${key}`, { signal });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not load comparison.");
      return result;
    },
    placeholderData: keepPreviousData,
  });
}
