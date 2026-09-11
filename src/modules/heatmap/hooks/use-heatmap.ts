"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { readJson, selectParams } from "@/lib";
import type { HeatmapData } from "../types";

export function useHeatmap(queryString: string) {
  const key = selectParams(new URLSearchParams(queryString), [
    "continent",
    "gender",
    "band",
  ]);
  return useQuery({
    queryKey: ["heatmap", key],
    queryFn: ({ signal }) =>
      readJson<HeatmapData>(`/api/heatmap?${key}`, signal),
    placeholderData: keepPreviousData,
  });
}
