"use client";
import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { X, Link as LinkIcon, Check } from "lucide-react";
import { Shell } from "@/components/shell";
import { Filters } from "@/components/dashboard/filters";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ReportSkeleton } from "./report-skeleton";
import { ReportDataTable } from "./report-data-table";
import { PeopleExplorer } from "./people-explorer";
import { useReportView } from "@/lib/use-report-view";
import type { PeopleFilters, PeopleReportKind } from "@/lib/people-types";
import {
  registrationOption,
  ageOption,
  demographicOption,
  countryOption,
} from "@/components/charts/people-options";
import type { ChartSelection } from "@/components/charts/echart";
import { continentForCountry, groupByContinent } from "@/lib/geography";

const EChart = dynamic(() => import("@/components/charts/echart"), {
  ssr: false,
  loading: () => (
    <div role="status" aria-label="Loading chart">
      <Skeleton className="h-[350px] w-full" />
    </div>
  ),
});
const pages = {
  registrations: {
    title: "Registrations",
    description: "Explore when people in this sample registered.",
    chart: "Registrations over time",
    note: "Counted by the registration date supplied by Random User. These dates describe sample profiles, not sign-ups to this application.",
  },
  ages: {
    title: "Age groups",
    description: "See how the selected people are distributed by age.",
    chart: "People by age group",
    note: "Age groups use the API’s supplied age. We do not recalculate age using today’s date.",
  },
  demographics: {
    title: "Demographics",
    description: "Compare the gender breakdown within each age group.",
    chart: "Gender by age group",
    note: "Both series use the same people-count scale. Gender and age are supplied by the API; no attributes are inferred.",
  },
  countries: {
    title: "Geography",
    description: "Explore where the people in this sample are located.",
    chart: "People by country",
    note: "Country comes from each profile’s location. Shares describe this generated sample, not real-world population statistics.",
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
  const { params, query, update, clear } = useReportView();
  const data = query.data;
  const [copiedUrl, setCopiedUrl] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const geography =
    params.get("geography") === "country" ? "country" : "continent";
  const info =
    kind === "countries" && geography === "continent"
      ? {
          ...pages.countries,
          chart: "People by continent",
          note: "Continents are grouped from each profile’s country using a geographic lookup. Shares describe this sample, not population statistics.",
        }
      : pages[kind];
  const option = useMemo(
    () =>
      !data
        ? null
        : kind === "registrations"
          ? registrationOption(data.timeline)
          : kind === "ages"
            ? ageOption(data.ages)
            : kind === "demographics"
              ? demographicOption(data.ages)
              : countryOption(
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
    if (kind === "registrations") {
      const row = data.timeline[selection.dataIndex];
      if (row) drill({ from: row.from, to: row.to });
    } else if (kind === "countries") {
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
          ...(kind === "demographics"
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
          <div className="report-status">
            <Badge variant="outline">Random User · sample data</Badge>
            {data && <span>Fetched {data.meta.fetchedAt.slice(0, 10)}</span>}
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
          <Alert variant="destructive" className="my-4">
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
                <Button variant="ghost" size="sm" onClick={clear}>
                  Reset to all data
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {data && option && (
          <>
            <section className="report-summary" aria-label="Report summary">
              <div>
                <span>People in this selection</span>
                <strong>
                  {data.metrics.totalPeople.toLocaleString("en-US")}
                </strong>
              </div>
              <div>
                <span>Average age</span>
                <strong>
                  {data.metrics.averageAge === null
                    ? "—"
                    : data.metrics.averageAge.toFixed(1)}
                  <small className="ml-2 text-sm font-normal text-muted-foreground">
                    years
                  </small>
                </strong>
              </div>
              <div>
                <span>Countries represented</span>
                <strong>{data.metrics.countryCount}</strong>
              </div>
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
                    {kind === "registrations" && (
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
                    {kind === "countries" && (
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
                  <p className="chart-note mt-0 shrink-0">{info.note}</p>
                </CardContent>
              </Card>
            </div>
            <p className="provenance">
              Fictional profiles from{" "}
              <a
                className="underline underline-offset-4"
                href="https://randomuser.me/documentation"
                target="_blank"
                rel="noreferrer"
              >
                Random User
              </a>
              . Charts summarize the supplied ages, registration dates, genders,
              and locations.
            </p>
            <PeopleExplorer params={params} update={update} />
          </>
        )}
      </div>
    </Shell>
  );
}
