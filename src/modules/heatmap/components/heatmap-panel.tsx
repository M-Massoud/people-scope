"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  ScrollBar,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { heatmapOption, heatmapScale } from "../charts";
import type {
  HeatmapAgeGroup,
  HeatmapMetric,
  HeatmapRow,
  HeatmapSelection,
} from "../types";

const EChart = dynamic(() => import("@/components/charts/heatmap-chart"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

type Props = {
  rows: HeatmapRow[];
  ageGroups: HeatmapAgeGroup[];
  metric: HeatmapMetric;
  display: "chart" | "table";
  selection?: HeatmapSelection;
  busy: boolean;
  onSelect: (row: HeatmapRow, group: HeatmapAgeGroup) => void;
  onUpdate: (patch: Record<string, string | null>) => void;
};
export function HeatmapPanel({
  rows,
  ageGroups,
  metric,
  display,
  selection,
  busy,
  onSelect,
  onUpdate,
}: Props) {
  const option = useMemo(
    () => heatmapOption(rows, ageGroups, metric, selection),
    [rows, ageGroups, metric, selection],
  );
  const height = Math.max(360, rows.length * 30 + 114);
  return (
    <Card className="min-w-0" aria-busy={busy}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle role="heading" aria-level={2}>
              Country × age group
            </CardTitle>
            <CardDescription className="mt-1">
              {metric === "share"
                ? "Share within each country"
                : "Number of people in each group"}{" "}
              · select a non-empty cell to explore
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <ToggleGroup
              aria-label="Heatmap values"
              size="sm"
              spacing={1}
              value={[metric]}
              onValueChange={(values) => {
                if (values.length) onUpdate({ metric: values[0] });
              }}
            >
              <ToggleGroupItem value="share">Share %</ToggleGroupItem>
              <ToggleGroupItem value="count">People</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              aria-label="Heatmap display"
              variant="outline"
              size="sm"
              spacing={0}
              value={[display]}
              onValueChange={(values) => {
                if (values.length) onUpdate({ display: values[0] });
              }}
            >
              <ToggleGroupItem value="chart">Heatmap</ToggleGroupItem>
              <ToggleGroupItem value="table">Data table</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <ScrollArea
          role="region"
          aria-label="Scrollable age and country matrix"
          data-testid="heatmap-scroll-area"
          className="min-w-0 [&>[data-slot=scroll-area-viewport]]:pb-4"
        >
          {display === "chart" ? (
            <div className="heatmap-canvas min-w-[820px]" style={{ height }}>
              <EChart
                option={option}
                label={`Country and age heatmap showing ${metric === "share" ? "percentages within each country" : "people counts"}. Use Data table for keyboard-accessible values and selection.`}
                testId="heatmap-chart"
                onSelect={({ dataIndex }) => {
                  const row = rows[Math.floor(dataIndex / ageGroups.length)];
                  const group = ageGroups[dataIndex % ageGroups.length];
                  if (row && group) onSelect(row, group);
                }}
              />
            </div>
          ) : (
            <Table
              scrollable={false}
              className="min-w-[820px]"
              data-testid="heatmap-table"
            >
              <TableCaption className="sr-only">
                Country and age matrix. Select a value to explore matching
                profiles.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">
                    Country
                  </TableHead>
                  {ageGroups.map((group) => (
                    <TableHead key={group.key} className="text-right">
                      {group.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Sample</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.country}>
                    <TableHead scope="row" className="sticky left-0 bg-card">
                      {row.country}
                    </TableHead>
                    {row.cells.map((cell, index) => {
                      const group = ageGroups[index];
                      const active =
                        selection?.country === row.country &&
                        selection.ageKey === group.key;
                      return (
                        <TableCell
                          key={group.key}
                          className="text-right tabular-nums"
                        >
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-end"
                            disabled={busy || !cell.count}
                            aria-pressed={active}
                            aria-label={`${row.country}, age ${group.label}: ${cell.count} people, ${cell.percentage.toFixed(1)}%`}
                            onClick={() => onSelect(row, group)}
                          >
                            {metric === "share"
                              ? `${cell.percentage.toFixed(1)}%`
                              : cell.count.toLocaleString("en-US")}
                          </Button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right tabular-nums">
                      {row.total.toLocaleString("en-US")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Color scale: 0–{heatmapScale(rows, metric)}
            {metric === "share" ? "%" : " people"}
          </span>
          <span>— = 0 people</span>
        </div>
      </CardContent>
    </Card>
  );
}
