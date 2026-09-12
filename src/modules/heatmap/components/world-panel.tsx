"use client";
import dynamic from "next/dynamic";
import { SingleChoiceToggle } from "@/components/form-fields";
import { MapPin } from "lucide-react";
import {
  Button,
  Badge,
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
  const leading = rows.reduce<HeatmapRow | undefined>(
    (largest, row) => (!largest || row.total > largest.total ? row : largest),
    undefined,
  );
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
            <SingleChoiceToggle
              label="Map color"
              spacing={1}
              value={metric}
              options={[
                { value: "count", label: "User count" },
                { value: "age", label: "Average age" },
              ]}
              onChange={onMetric}
            />
          </div>
          {selected ? (
            <div className="mt-2">
              <Badge variant="secondary">
                <MapPin data-icon="inline-start" />
                {selected} selected
              </Badge>
            </div>
          ) : leading && total > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {leading.country} accounts for{" "}
              <strong className="font-medium text-foreground">
                {((leading.total / total) * 100).toFixed(1)}%
              </strong>{" "}
              of this selection.
            </p>
          ) : null}
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
                      <div className="country-share-track" aria-hidden="true">
                        <span
                          style={{ width: `${(row.total / total) * 100}%` }}
                        />
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
        </CardContent>
      </Card>
    </div>
  );
}
