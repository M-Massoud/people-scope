import type { PeopleMeta } from "@/modules/people";

export type HeatmapMetric = "share" | "count";
export type HeatmapOrder = "name" | "size" | "older";
export type HeatmapAgeGroup = {
  key: string;
  label: string;
  min: number;
  max: number;
};
export type HeatmapRow = {
  country: string;
  total: number;
  averageAge: number;
  cells: { count: number; percentage: number }[];
};
export type HeatmapSelection = { country: string; ageKey: string };
export type HeatmapData = {
  meta: PeopleMeta;
  filters: {
    continent?: string;
    gender: "all" | "male" | "female";
    ageMin?: string;
    ageMax?: string;
  };
  totalPeople: number;
  ageGroups: HeatmapAgeGroup[];
  rows: HeatmapRow[];
};
