"use client";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { registerMap, use } from "echarts/core";
import { MapChart } from "echarts/charts";
import { Minus, Plus, RotateCcw } from "lucide-react";
import EChart from "@/components/charts/echart";
import type { EChartsType } from "@/components/charts";
import { Alert, AlertDescription, Button, Skeleton } from "@/components/ui";
import { readJson } from "@/lib";
import {
  WORLD_MAP,
  worldMapOption,
  type WorldMetric,
} from "../charts/world-options";
import type { HeatmapRow } from "../types";

// This module and the map renderer are loaded only when the world view is opened.
use([MapChart]);

type Props = {
  rows: HeatmapRow[];
  metric: WorldMetric;
  selected?: string;
  onSelect: (row: HeatmapRow) => void;
};
export default function WorldChart({
  rows,
  metric,
  selected,
  onSelect,
}: Props) {
  const instance = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);
  const geometry = useQuery({
    queryKey: ["world-boundaries"],
    queryFn: async ({ signal }) => {
      const json = await readJson<Parameters<typeof registerMap>[1]>(
        "/maps/world.json",
        signal,
      );
      registerMap(WORLD_MAP, json);
      return true;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const option = useMemo(
    () => worldMapOption(rows, metric, selected),
    [rows, metric, selected],
  );
  const zoom = (factor: number) => {
    const chart = instance.current;
    if (!chart) return;
    const series = (chart.getOption().series as { zoom?: number }[])[0];
    chart.setOption({
      series: [
        {
          id: "world-countries",
          zoom: Math.max(1, Math.min(12, (series.zoom ?? 1) * factor)),
        },
      ],
    });
  };
  return (
    <div
      className="world-map-surface relative h-[320px] sm:h-[520px]"
      data-testid="world-map-panel"
    >
      {geometry.isPending ? (
        <Skeleton className="size-full" aria-label="Loading world boundaries" />
      ) : geometry.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p>
              Unable to load the world map. Country values remain available in
              the table.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void geometry.refetch()}
            >
              Retry map
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="heatmap-canvas h-full">
            <EChart
              option={option}
              testId="world-map-chart"
              label={`World map colored by ${metric === "age" ? "average age" : "user count"}. Select a country to explore its profiles. The country table provides keyboard access.`}
              onReady={(chart) => {
                instance.current = chart;
                setReady(true);
              }}
              onSelect={({ name }) => {
                const row = rows.find(
                  (row) =>
                    row.country === name ||
                    (row.country === "Türkiye" && name === "Turkey"),
                );
                if (row) onSelect(row);
              }}
            />
          </div>
          <div
            className="absolute right-2 top-2 flex gap-1 rounded-lg border bg-card p-1"
            aria-label="Map controls"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              disabled={!ready}
              onClick={() => zoom(1.5)}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              disabled={!ready}
              onClick={() => zoom(1 / 1.5)}
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!ready}
              onClick={() =>
                instance.current?.setOption({
                  series: [{ id: "world-countries", zoom: 1, center: null }],
                })
              }
            >
              <RotateCcw data-icon="inline-start" />
              Reset view
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
