"use client";
import { PAGES } from "@/config";

import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Link as LinkIcon, MapPin } from "lucide-react";
import { patchParams } from "@/lib";
import { useCountryComparison } from "../hooks";
import { Shell, SummaryCard } from "@/components";
import { LabeledSelect } from "@/components/form-fields";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  FieldGroup,
  ScrollArea,
  ScrollBar,
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
import { comparisonOption, comparisonScale } from "../charts";

const BarChart = dynamic(() => import("@/components/charts/bar-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const RadarChart = dynamic(() => import("@/components/charts/radar-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

function ComparisonSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading comparison"
      data-testid="comparison-skeleton"
      className="report-grid"
    >
      {[0, 1].map((index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ComparisonPage() {
  return (
    <Suspense
      fallback={
        <Shell active="compare-countries">
          <div className="report-page">
            <h1>{PAGES["compare-countries"].title}</h1>
            <ComparisonSkeleton />
          </div>
        </Shell>
      }
    >
      <ComparisonContent />
    </Suspense>
  );
}

function ComparisonContent() {
  const params = useSearchParams();
  const view = params.get("view") === "bar" ? "bar" : "radar";
  const EChart = view === "bar" ? BarChart : RadarChart;
  const [copyMessage, setCopyMessage] = useState("");
  const query = useCountryComparison(params.toString());
  const data = query.data;
  const countryA = params.get("countryA") ?? data?.groups[0]?.country ?? "";
  const countryB = params.get("countryB") ?? data?.groups[1]?.country ?? "";
  const update = (patch: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.search = patchParams(url.searchParams, patch).toString();
    window.history.pushState(null, "", url);
    setCopyMessage("");
  };
  const reset = () =>
    window.history.pushState(null, "", PAGES["compare-countries"].href);
  const option = useMemo(
    () => comparisonOption(data?.groups ?? [], view),
    [data, view],
  );
  const ready = data && !query.isError;

  return (
    <Shell active="compare-countries">
      <div className="report-page">
        <div className="page-heading">
          <div>
            <h1>{PAGES["compare-countries"].title}</h1>
            <p>Compare the age profiles of two countries in this sample.</p>
          </div>
        </div>
        {data && data.groups.length === 2 && (
          <div className="filter-panel mb-5">
            <FieldGroup className="grid sm:grid-cols-2">
              <LabeledSelect
                id="country-a"
                label="First country"
                value={countryA}
                items={data.availableCountries
                  .filter((country) => country !== countryB)
                  .map((country) => ({ value: country, label: country }))}
                onChange={(value) => update({ countryA: value })}
              />
              <LabeledSelect
                id="country-b"
                label="Second country"
                value={countryB}
                items={data.availableCountries
                  .filter((country) => country !== countryA)
                  .map((country) => ({ value: country, label: country }))}
                onChange={(value) => update({ countryB: value })}
              />
            </FieldGroup>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                All ages, genders, and registration dates. Selections apply
                immediately.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const url = new URL(window.location.href);
                    url.search = new URLSearchParams({
                      countryA,
                      countryB,
                      view,
                    }).toString();
                    await navigator.clipboard.writeText(url.toString());
                    setCopyMessage("Link copied");
                  } catch {
                    setCopyMessage(
                      "Copy the browser address to share this view.",
                    );
                  }
                }}
              >
                <LinkIcon data-icon="inline-start" />
                Copy view link
              </Button>
            </div>
            {copyMessage && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                {copyMessage}
              </p>
            )}
          </div>
        )}
        {query.isError && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>
              <p>{query.error.message}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void query.refetch()}
                >
                  Try again
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Reset comparison
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {query.isPending && <ComparisonSkeleton />}
        {query.isFetching && data && !query.isError && (
          <Alert role="status" className="mb-5">
            <AlertDescription>
              Updating comparison. The chart and table still show{" "}
              {data.groups.map((group) => group.country).join(" and ")}.
            </AlertDescription>
          </Alert>
        )}
        {ready && data.groups.length < 2 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Not enough countries to compare</EmptyTitle>
              <EmptyDescription>
                This sample needs profiles from at least two countries.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {ready && data.groups.length === 2 && (
          <>
            <section
              className="report-summary comparison-summary"
              aria-label="Country sample sizes"
            >
              {data.groups.map((group, index) => (
                <SummaryCard
                  key={group.country}
                  label={group.country}
                  value={group.total.toLocaleString("en-US")}
                  icon={MapPin}
                  tone={index === 0 ? "blue" : "teal"}
                  detail="People in the country sample"
                />
              ))}
            </section>
            <div className="report-grid" aria-busy={query.isFetching}>
              <Card className="min-w-0">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle role="heading" aria-level={2}>
                        Age distribution
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Share within each country · scale 0–
                        {comparisonScale(data.groups)}%
                      </CardDescription>
                    </div>
                    <ToggleGroup
                      aria-label="Chart view"
                      size="sm"
                      spacing={1}
                      value={[view]}
                      onValueChange={(values) => {
                        if (values.length) update({ view: values[0] });
                      }}
                    >
                      <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
                      <ToggleGroupItem value="radar">Radar</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardHeader>
                <CardContent className="report-chart-content min-h-0 flex-1">
                  <EChart
                    key={view}
                    option={option}
                    label={`${view === "bar" ? "Bar" : "Radar"} chart comparing age percentages in ${data.groups[0].country} and ${data.groups[1].country}. Exact values are in the comparison table.`}
                    testId="comparison-chart"
                  />
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Comparison data
                  </CardTitle>
                  <CardDescription>
                    Percentage and people in each age group
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                  <ScrollArea
                    className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-3"
                    role="region"
                    aria-label="Scrollable country comparison"
                  >
                    <Table scrollable={false} data-testid="comparison-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-card">
                            Age
                          </TableHead>
                          {data.groups.map((group) => (
                            <TableHead
                              className="sticky top-0 bg-card text-right"
                              key={group.country}
                            >
                              {group.country}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.groups[0].ages.map((age, index) => (
                          <TableRow key={age.key}>
                            <TableCell>{age.label}</TableCell>
                            {data.groups.map((group) => (
                              <TableCell
                                className="text-right tabular-nums"
                                key={group.country}
                              >
                                <span>
                                  {group.ages[index].percentage.toFixed(1)}%
                                </span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({group.ages[index].count})
                                </span>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
