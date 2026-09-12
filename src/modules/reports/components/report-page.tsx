"use client";
import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Link as LinkIcon,
  Check,
  Users,
  Globe2,
  CalendarDays,
  SlidersHorizontal,
  RotateCw,
} from "lucide-react";
import { REPORT_PAGES } from "@/config";
import { Shell, SummaryCard } from "@/components";
import { Filters } from "./filters";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { ReportSkeleton } from "./report-skeleton";
import { ReportDataTable } from "./report-data-table";
import { PeopleExplorer } from "@/modules/people/components";
import { useReportView } from "../hooks";
import {
  continentForCountry,
  groupByContinent,
  type PeopleFilters,
} from "@/modules/people";
import type { PeopleReportKind } from "../types";
import {
  timelineOption,
  ageGroupsOption,
  ageGenderOption,
  geographyOption,
} from "../charts";
import type { ChartSelection } from "@/components/charts";

function ChartLoading() {
  return (
    <div role="status" aria-label="Loading chart">
      <Skeleton className="h-[350px] w-full" />
    </div>
  );
}

const BarChart = dynamic(() => import("@/components/charts/bar-chart"), {
  ssr: false,
  loading: ChartLoading,
});
const PieChart = dynamic(() => import("@/components/charts/pie-chart"), {
  ssr: false,
  loading: ChartLoading,
});
const pages = {
  "profile-timeline": {
    ...REPORT_PAGES["profile-timeline"],
    description: "Explore how profiles are distributed by registration date.",
    chart: "Profiles by registration date",
  },
  "age-groups": {
    ...REPORT_PAGES["age-groups"],
    description: "See how the selected people are distributed by age.",
    chart: "People by age group",
  },
  "age-gender": {
    ...REPORT_PAGES["age-gender"],
    description: "Compare the gender breakdown within each age group.",
    chart: "Gender by age group",
  },
  geography: {
    ...REPORT_PAGES["geography"],
    description: "Explore where the people in this sample are located.",
    chart: "People by country",
  },
};
export function ReportPage({ kind }: { kind: PeopleReportKind }) {
  return (
    <Suspense
      fallback={
        <Shell active={kind}>
          <div className="report-page">
            <h1>{pages[kind].title}</h1>
            <ReportSkeleton />
          </div>
        </Shell>
      }
    >
      <ReportContent kind={kind} />
    </Suspense>
  );
}
function ReportContent({ kind }: { kind: PeopleReportKind }) {
  const EChart = kind === "geography" ? PieChart : BarChart;
  const { params, query, update, clear } = useReportView();
  const data = query.data;
  const largestAge = data?.ages.reduce(
    (largest, age) => (age.total > largest.total ? age : largest),
    data.ages[0],
  );
  const ageDetail = largestAge?.total
    ? `Largest age band: ${largestAge.label}${data!.ages.filter((age) => age.total === largestAge.total).length > 1 ? " (tied)" : ""}`
    : "Across the selected profiles";
  const [copiedUrl, setCopiedUrl] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const geography =
    params.get("geography") === "country" ? "country" : "continent";
  const info =
    kind === "geography" && geography === "continent"
      ? {
          ...pages.geography,
          chart: "People by continent",
        }
      : pages[kind];
  const option = useMemo(
    () =>
      !data
        ? null
        : kind === "profile-timeline"
          ? timelineOption(data.timeline)
          : kind === "age-groups"
            ? ageGroupsOption(data.ages)
            : kind === "age-gender"
              ? ageGenderOption(data.ages)
              : geographyOption(
                  geography === "continent"
                    ? groupByContinent(data.countries)
                    : data.countries,
                ),
    [data, kind, geography],
  );
  const filters: PeopleFilters | undefined = data
    ? {
        from: params.get("from") ?? data.filters.from,
        to: params.get("to") ?? data.filters.to,
        country: params.get("country") ?? "all",
        gender: (params.get("gender") ?? "all") as PeopleFilters["gender"],
        ageMin: params.get("ageMin") ?? "",
        ageMax: params.get("ageMax") ?? "",
        ...(params.has("continent")
          ? { continent: params.get("continent")! }
          : {}),
      }
    : undefined;
  const drill = (patch: Record<string, string | null>) => {
    if (query.isFetching || query.isError) return;
    // An age bar represents only the intersection with the current age filter.
    if (data && patch.ageMin && patch.ageMax) {
      patch = {
        ...patch,
        ageMin: String(
          Math.max(Number(patch.ageMin), Number(data.filters.ageMin || 0)),
        ),
        ageMax: String(
          Math.min(Number(patch.ageMax), Number(data.filters.ageMax || 120)),
        ),
      };
    }
    update({ explore: "1", search: null, page: null, ...patch });
    requestAnimationFrame(() =>
      document
        .getElementById("people-explorer")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const onChartSelect = (selection: ChartSelection) => {
    if (!data) return;
    if (kind === "profile-timeline") {
      const row = data.timeline[selection.dataIndex];
      if (row) drill({ from: row.from, to: row.to });
    } else if (kind === "geography") {
      const row = (
        geography === "continent"
          ? groupByContinent(data.countries)
          : data.countries
      )[selection.dataIndex];
      if (row)
        drill(
          geography === "continent"
            ? { continent: row.name, country: null }
            : { country: row.name },
        );
    } else {
      const row = data.ages[selection.dataIndex];
      if (row)
        drill({
          ageMin: String(row.min),
          ageMax: String(row.max),
          ...(kind === "age-gender"
            ? { gender: selection.seriesName?.toLowerCase() ?? null }
            : {}),
        });
    }
  };
  const chips: { key: string; label: string; patch: Record<string, null> }[] =
    [];
  if (params.has("continent"))
    chips.push({
      key: "continent",
      label: params.get("continent")!,
      patch: { continent: null },
    });
  if (params.has("country"))
    chips.push({
      key: "country",
      label: params.get("country")!,
      patch: { country: null },
    });
  if (params.has("gender"))
    chips.push({
      key: "gender",
      label: `Gender: ${params.get("gender")}`,
      patch: { gender: null },
    });
  if (params.has("ageMin") || params.has("ageMax"))
    chips.push({
      key: "age",
      label: `Age: ${params.get("ageMin") || 0}–${params.get("ageMax") || 120}`,
      patch: { ageMin: null, ageMax: null },
    });
  if (params.has("from") || params.has("to"))
    chips.push({
      key: "dates",
      label: `${filters?.from ?? params.get("from")} — ${filters?.to ?? params.get("to")}`,
      patch: { from: null, to: null },
    });
  return (
    <Shell active={kind} queryString={params.toString()}>
      <div className="report-page">
        <div className="page-heading">
          <div>
            <h1>{info.title}</h1>
            <p>{info.description}</p>
          </div>
        </div>
        {data && filters && (
          <Filters
            key={JSON.stringify(filters)}
            value={filters}
            countries={data.availableCountries.filter(
              (country) =>
                !filters.continent ||
                continentForCountry(country) === filters.continent,
            )}
            availablePeriod={data.availablePeriod}
            onChange={(next) => update({ ...next, page: null })}
            onReset={clear}
          />
        )}
        {data && (
          <div className="my-3 flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap items-center gap-2"
              aria-label="Active report filters"
            >
              {chips.map((chip) => (
                <Button
                  key={chip.key}
                  variant="secondary"
                  size="sm"
                  aria-label={`Remove ${chip.key} filter`}
                  onClick={() => update({ ...chip.patch, page: null })}
                >
                  {chip.label}
                  <X data-icon="inline-end" />
                </Button>
              ))}
              {!!chips.length && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" role="status">
                {copyFailed
                  ? "Copy the address from your browser to share this view."
                  : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiedUrl(window.location.href);
                    setCopyFailed(false);
                  } catch {
                    setCopyFailed(true);
                  }
                }}
              >
                {copiedUrl &&
                copiedUrl.endsWith(
                  `${window.location.pathname}${window.location.search}`,
                ) ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <LinkIcon data-icon="inline-start" />
                )}
                Copy view link
              </Button>
            </div>
          </div>
        )}
        {query.isPending && <ReportSkeleton />}
        {query.isFetching && data && (
          <Alert role="status" className="my-4">
            <AlertDescription>
              Updating report. The figures still reflect the selection shown
              below.
            </AlertDescription>
          </Alert>
        )}
        {query.isError && (
          <Alert className="my-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <SlidersHorizontal className="size-5" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <AlertTitle>
                <h2>We couldn’t load this report</h2>
              </AlertTitle>
              <AlertDescription>{query.error.message}</AlertDescription>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={clear}>Reset to all data</Button>
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  <RotateCw data-icon="inline-start" />
                  {query.isFetching ? "Retrying…" : "Try again"}
                </Button>
              </div>
            </div>
          </Alert>
        )}
        {data && option && (
          <>
            <section className="report-summary" aria-label="Report summary">
              <SummaryCard
                label="People in this selection"
                value={data.metrics.totalPeople.toLocaleString("en-US")}
                icon={Users}
                detail="Profiles matching your filters"
              />
              <SummaryCard
                label="Average age"
                value={
                  data.metrics.averageAge === null ? (
                    "—"
                  ) : (
                    <>
                      {data.metrics.averageAge.toFixed(1)}
                      <small>years</small>
                    </>
                  )
                }
                icon={CalendarDays}
                tone="amber"
                detail={ageDetail}
              />
              <SummaryCard
                label="Countries represented"
                value={data.metrics.countryCount}
                icon={Globe2}
                tone="teal"
                detail="Locations in this selection"
              />
            </section>
            <p className="mb-4 text-xs text-muted-foreground">
              Registered · UTC {data.filters.from} — {data.filters.to} ·{" "}
              {data.filters.continent ? `${data.filters.continent} · ` : ""}
              {data.filters.country === "all"
                ? "All countries"
                : data.filters.country}{" "}
              ·{" "}
              {data.filters.gender === "all"
                ? "All genders"
                : data.filters.gender}{" "}
              · Age {data.filters.ageMin || 0}–{data.filters.ageMax || 120}
            </p>
            <div className="report-grid" aria-busy={query.isFetching}>
              <Card className="min-w-0">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle role="heading" aria-level={2}>
                        {info.chart}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Select a chart mark to explore matching people
                      </CardDescription>
                    </div>
                    {kind === "profile-timeline" && (
                      <ToggleGroup
                        aria-label="Time grouping"
                        size="sm"
                        spacing={1}
                        value={[data.grouping]}
                        onValueChange={(values) => {
                          if (values.length) update({ grouping: values[0] });
                        }}
                      >
                        <ToggleGroupItem value="year">Yearly</ToggleGroupItem>
                        <ToggleGroupItem value="month">Monthly</ToggleGroupItem>
                      </ToggleGroup>
                    )}
                    {kind === "geography" && (
                      <ToggleGroup
                        aria-label="Geographic grouping"
                        size="sm"
                        spacing={1}
                        value={[geography]}
                        onValueChange={(values) => {
                          if (values.length) update({ geography: values[0] });
                        }}
                      >
                        <ToggleGroupItem value="continent">
                          Continents
                        </ToggleGroupItem>
                        <ToggleGroupItem value="country">
                          Countries
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="report-chart-content min-h-0 flex-1">
                  {data.metrics.totalPeople === 0 ? (
                    <Empty className="h-full">
                      <EmptyHeader>
                        <EmptyTitle>No people for these filters.</EmptyTitle>
                        <EmptyDescription>
                          Change the country, age range, gender, or registration
                          dates.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <EChart
                      key={kind}
                      option={option}
                      label={info.chart}
                      testId="report-chart"
                      onSelect={onChartSelect}
                    />
                  )}
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Report data
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                  <ReportDataTable
                    kind={kind}
                    data={data}
                    drill={drill}
                    disabled={query.isFetching || query.isError}
                    geography={geography}
                  />
                </CardContent>
              </Card>
            </div>
            <PeopleExplorer params={params} update={update} />
          </>
        )}
      </div>
    </Shell>
  );
}
