"use client";
import { PAGES } from "@/config";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link as LinkIcon, X, Users, Globe2, CalendarDays } from "lucide-react";
import { Shell, SummaryCard } from "@/components";
import { LabeledSelect } from "@/components/form-fields";
import {
  Alert,
  AlertDescription,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  FieldGroup,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { CONTINENTS, PEOPLE_KEYS, ageBands } from "@/modules/people";
import { PeopleExplorer } from "@/modules/people/components";
import { patchParams, selectParams } from "@/lib";
import { sortHeatmapRows } from "../charts";
import { useHeatmap } from "../hooks";
import type {
  HeatmapAgeGroup,
  HeatmapMetric,
  HeatmapOrder,
  HeatmapRow,
} from "../types";
import { WorldPanel } from "./world-panel";
import { HeatmapPanel } from "./heatmap-panel";
import { HeatmapSkeleton } from "./heatmap-skeleton";

export function HeatmapPage() {
  return (
    <Suspense
      fallback={
        <Shell active="heatmap">
          <div className="report-page">
            <h1>{PAGES.heatmap.title}</h1>
            <HeatmapSkeleton />
          </div>
        </Shell>
      }
    >
      <HeatmapContent />
    </Suspense>
  );
}

function HeatmapContent() {
  const search = useSearchParams();
  const params = new URLSearchParams(search.toString());
  const query = useHeatmap(params.toString());
  const data = query.data;
  // Preserve old matrix links while making the world map the default for new visits.
  const view =
    params.get("view") === "age" ||
    (!params.has("view") && (params.has("ageMin") || params.has("display")))
      ? "age"
      : "world";
  const worldMetric = params.get("color") === "age" ? "age" : "count";
  const metric: HeatmapMetric =
    params.get("metric") === "count" ? "count" : "share";
  const order: HeatmapOrder =
    params.get("order") === "size"
      ? "size"
      : params.get("order") === "older"
        ? "older"
        : "name";
  const display = params.get("display") === "table" ? "table" : "chart";
  const [copyMessage, setCopyMessage] = useState("");
  const rows = useMemo(
    () => sortHeatmapRows(data?.rows ?? [], order),
    [data, order],
  );
  const group = data?.ageGroups.find(
    (age) =>
      String(age.min) === params.get("ageMin") &&
      String(age.max) === params.get("ageMax"),
  );
  const row = data?.rows.find(
    (country) => country.country === params.get("country"),
  );
  const selected =
    row && group ? { country: row.country, ageKey: group.key } : undefined;
  const selectedCell =
    row && group && data ? row.cells[data.ageGroups.indexOf(group)] : undefined;
  const ready = data && !query.isError;
  const update = (patch: Record<string, string | null>, replace = false) => {
    const url = new URL(window.location.href);
    url.search = patchParams(url.searchParams, { view, ...patch }).toString();
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    setCopyMessage("");
  };
  const clearSelection = {
    country: null,
    ageMin: null,
    ageMax: null,
    explore: null,
    search: null,
    page: null,
  };
  const filter = (patch: Record<string, string | null>) =>
    update({ ...clearSelection, ...patch });
  const drill = (country: HeatmapRow, age?: HeatmapAgeGroup) => {
    if (query.isFetching || query.isError || !data) return;
    const cell = age ? country.cells[data.ageGroups.indexOf(age)] : undefined;
    if (age && !cell?.count) return;
    update({
      country: country.country,
      ageMin: age ? String(age.min) : null,
      ageMax: age ? String(age.max) : null,
      explore: "1",
      search: null,
      page: null,
    });
    requestAnimationFrame(() =>
      document
        .getElementById("people-explorer")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  // Match the explorer to the matrix's actual filters; unrelated URL fields do not alter its denominator.
  const explorerParams = new URLSearchParams(
    selectParams(params, [...PEOPLE_KEYS, "explore"]),
  );
  if (data?.filters.continent)
    explorerParams.set("continent", data.filters.continent);
  if (data?.filters.gender && data.filters.gender !== "all")
    explorerParams.set("gender", data.filters.gender);
  if (data?.filters.ageMin) {
    explorerParams.set("ageMin", data.filters.ageMin);
    explorerParams.set("ageMax", data.filters.ageMax!);
  }
  if (view === "world" && row) explorerParams.set("country", row.country);
  if (view === "age" && selected && group) {
    explorerParams.set("country", selected.country);
    explorerParams.set("ageMin", String(group.min));
    explorerParams.set("ageMax", String(group.max));
  }
  const invalidSelection =
    ready && params.has("country") && !(view === "world" ? row : selected);

  return (
    <Shell active="heatmap">
      <div className="report-page">
        <div className="page-heading flex-col items-start sm:flex-row sm:items-center">
          <div>
            <h1>{PAGES.heatmap.title}</h1>
            <p>
              Explore where people are from and how their age profiles compare.
            </p>
          </div>
        </div>
        <div className="filter-panel">
          <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LabeledSelect
              id="heatmap-continent"
              label="Continent"
              value={params.get("continent") ?? "all"}
              items={[
                { value: "all", label: "All continents" },
                ...CONTINENTS.map((value) => ({ value, label: value })),
              ]}
              onChange={(continent) => filter({ continent })}
            />
            <LabeledSelect
              id="heatmap-gender"
              label="Gender"
              value={params.get("gender") ?? "all"}
              items={[
                { value: "all", label: "All genders" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
              onChange={(gender) => filter({ gender })}
            />
            <LabeledSelect
              id="heatmap-band"
              label="Age group"
              value={params.get("band") ?? "all"}
              items={[
                { value: "all", label: "All ages" },
                ...ageBands.map(([min, max]) => ({
                  value: `${min}-${max}`,
                  label: min === 75 ? "75+ years" : `${min}–${max} years`,
                })),
              ]}
              onChange={(band) => filter({ band })}
            />
            <LabeledSelect
              id="heatmap-order"
              label="Order countries"
              value={order}
              items={[
                { value: "name", label: "Country A–Z" },
                { value: "size", label: "Largest sample first" },
                { value: "older", label: "Highest share aged 65+" },
              ]}
              onChange={(order) => update({ order })}
            />
          </FieldGroup>
          <div className="filter-actions flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">
              All registration dates · filters apply immediately
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.history.pushState(null, "", "/heatmap");
                  setCopyMessage("");
                }}
              >
                Reset heatmap
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
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
          </div>
          {copyMessage && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {copyMessage}
            </p>
          )}
        </div>
        <div className="my-5">
          <ToggleGroup
            aria-label="Geography view"
            variant="outline"
            size="sm"
            spacing={0}
            value={[view]}
            onValueChange={(values) => {
              if (values.length) update({ ...clearSelection, view: values[0] });
            }}
          >
            <ToggleGroupItem value="world">World map</ToggleGroupItem>
            <ToggleGroupItem value="age">Age heatmap</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {query.isPending && <HeatmapSkeleton view={view} />}
        {query.isError && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>
              <p>{query.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Retry heatmap
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {ready && (
          <>
            <section className="report-summary" aria-label="Heatmap summary">
              <SummaryCard
                label="People in this selection"
                value={data.totalPeople.toLocaleString("en-US")}
                icon={Users}
                detail="Profiles matching your filters"
              />
              <SummaryCard
                label="Countries represented"
                value={data.rows.length}
                icon={Globe2}
                tone="teal"
                detail="Explore a country on the map"
              />
              <SummaryCard
                label="Average age"
                value={
                  data.totalPeople ? (
                    <>
                      {(
                        data.rows.reduce(
                          (sum, row) => sum + row.averageAge * row.total,
                          0,
                        ) / data.totalPeople
                      ).toFixed(1)}
                      <small>years</small>
                    </>
                  ) : (
                    "—"
                  )
                }
                icon={CalendarDays}
                tone="amber"
                detail="Across the selected profiles"
              />
            </section>
            {query.isFetching && (
              <Alert role="status" className="mb-4">
                <AlertDescription>
                  Updating the view. Previous results remain visible.
                </AlertDescription>
              </Alert>
            )}
            {data.totalPeople === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No people for these filters</EmptyTitle>
                  <EmptyDescription>
                    Choose another continent, gender, or age group, or reset the
                    heatmap.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                {view === "world" ? (
                  <WorldPanel
                    rows={rows}
                    metric={worldMetric}
                    selected={row?.country}
                    busy={query.isFetching}
                    onSelect={(row) => drill(row)}
                    onMetric={(color) => update({ color })}
                  />
                ) : (
                  <HeatmapPanel
                    rows={rows}
                    ageGroups={data.ageGroups}
                    metric={metric}
                    display={display}
                    selection={selected}
                    busy={query.isFetching}
                    onSelect={drill}
                    onUpdate={update}
                  />
                )}
                {view === "age" && (
                  <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
                    <p className="font-medium">
                      {metric === "share"
                        ? "Compare the mix, even when sample sizes differ."
                        : "Compare how many people are in each group."}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {metric === "share"
                        ? "Each row totals 100%. A cell is the age-group count divided by that country’s filtered sample. Switch to People to see the underlying counts."
                        : "Countries with larger samples can have darker cells. Switch to Share % to compare their age distributions on the same basis."}{" "}
                      Age bands have different widths; the 75+ group covers ages
                      75–120.
                    </p>
                  </div>
                )}
                {view === "world" && row && (
                  <section
                    aria-label="Selected country"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                  >
                    <div>
                      <p className="font-medium">{row.country}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.total.toLocaleString("en-US")} people ·{" "}
                        {((row.total / data.totalPeople) * 100).toFixed(1)}% of
                        selection · Average age {row.averageAge.toFixed(1)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(clearSelection)}
                    >
                      <X data-icon="inline-start" />
                      Clear selection
                    </Button>
                  </section>
                )}
                {view === "age" && selected && selectedCell && group && (
                  <section
                    aria-label="Selected heatmap group"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Selected group
                      </p>
                      <p className="mt-1 font-medium">
                        {selected.country} · {group.label} years
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedCell.count.toLocaleString("en-US")} people ·{" "}
                        {selectedCell.percentage.toFixed(1)}% of this country’s
                        sample
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(clearSelection)}
                    >
                      <X data-icon="inline-start" />
                      Clear selection
                    </Button>
                  </section>
                )}
                {invalidSelection ? (
                  <Alert className="mt-5">
                    <AlertDescription>
                      <p>
                        This selected group is not available with the current
                        filters.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => update(clearSelection)}
                      >
                        Clear selection
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <PeopleExplorer params={explorerParams} update={update} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
