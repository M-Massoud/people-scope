"use client";
import dynamic from "next/dynamic";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import type { WorldMetric } from "../charts/world-options";
import type { HeatmapRow } from "../types";

const WorldChart = dynamic(() => import("./world-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full sm:h-[520px]" />,
});

type Props = {
  rows: HeatmapRow[];
  metric: WorldMetric;
  selected?: string;
  busy: boolean;
  onSelect: (row: HeatmapRow) => void;
  onMetric: (metric: string) => void;
};
export function WorldPanel({
  rows,
  metric,
  selected,
  busy,
  onSelect,
  onMetric,
}: Props) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return (
    <div
      className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)]"
      aria-busy={busy}
    >
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle role="heading" aria-level={2}>
                People around the world
              </CardTitle>
              <CardDescription className="mt-1">
                Select a country to explore its people.
              </CardDescription>
            </div>
            <ToggleGroup
              aria-label="Map color"
              size="sm"
              spacing={1}
              value={[metric]}
              onValueChange={(values) => {
                if (values.length) onMetric(values[0]);
              }}
            >
              <ToggleGroupItem value="count">User count</ToggleGroupItem>
              <ToggleGroupItem value="age">Average age</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          <WorldChart
            rows={rows}
            metric={metric}
            selected={selected}
            onSelect={onSelect}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-sm border bg-[#edf0f2]" />
              No profiles in this selection
            </span>
            <a
              href="https://www.naturalearthdata.com/about/terms-of-use/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Map: Natural Earth
            </a>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            Country breakdown
          </CardTitle>
          <CardDescription>
            Same selection · {rows.length} countries
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <ScrollArea
            className="h-[520px] min-h-0 xl:flex-1 xl:basis-0"
            aria-label="Country breakdown"
            role="region"
          >
            <Table scrollable={false} data-testid="world-country-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">People</TableHead>
                  <TableHead className="text-right">Avg. age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.country}
                    data-state={
                      selected === row.country ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto justify-start whitespace-normal p-0 text-left"
                        aria-label={`Explore ${row.country}`}
                        aria-pressed={selected === row.country}
                        disabled={busy}
                        onClick={() => onSelect(row)}
                      >
                        {row.country}
                      </Button>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {((row.total / total) * 100).toFixed(1)}% of selection
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.total.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.averageAge.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <p className="mt-3 text-xs text-muted-foreground">
            Colors describe the filtered sample. The scale updates with your
            filters.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
