"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
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
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Sheet,
  SheetContent,
} from "@/components/ui";
import { LabeledSelect } from "@/components/form-fields";
import type { PersonSummary } from "../types";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/config";
import {
  usePeoplePage,
  useTableMeasurement,
  getTableBenchmarkMode,
} from "../hooks";
import { PeopleTableSkeleton } from "./people-table-skeleton";
import { OptimizedPeopleTable } from "./optimized-people-table";
import { PeopleTable } from "./people-table";
import { PersonDetails } from "./person-details";

type Update = (patch: Record<string, string | null>, replace?: boolean) => void;
function PeopleSearch({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setDraft(value);
    clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [value]);
  return (
    <Field>
      <FieldLabel htmlFor="people-search">Search people</FieldLabel>
      <Input
        id="people-search"
        type="search"
        maxLength={100}
        placeholder="Name, email, or location"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onCommit(next), 300);
        }}
      />
    </Field>
  );
}
export function PeopleExplorer({
  params,
  update,
}: {
  params: URLSearchParams;
  update: Update;
}) {
  // Normal browsing uses the optimized table. The benchmark can select either.
  const TableComponent =
    getTableBenchmarkMode() === "regular" ? PeopleTable : OptimizedPeopleTable;
  const open = params.get("explore") === "1";
  const query = usePeoplePage(params, open);
  const data = query.data;
  const measurePageSize = useTableMeasurement({
    enabled: open,
    pageSize: data?.pageSize,
    requestedPageSize: Number(
      params.get("pageSize") ?? DEFAULT_TABLE_PAGE_SIZE,
    ),
    ready: query.isSuccess && !query.isFetching && !query.isPlaceholderData,
    failed: query.isError,
  });
  const [selected, setSelected] = useState<PersonSummary | null>(null);
  const section = useRef<HTMLDivElement>(null);
  const clearSearch = () => {
    update({ search: null, page: null });
    document.getElementById("people-search")?.focus();
  };
  return (
    <div id="people-explorer" ref={section} className="mt-6 scroll-mt-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle role="heading" aria-level={2}>
              People explorer
            </CardTitle>
            <CardDescription className="mt-1">
              Inspect the records behind the report. Search applies to this
              table.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            onClick={() => {
              update({ explore: open ? null : "1" });
              if (!open)
                requestAnimationFrame(() =>
                  section.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  }),
                );
            }}
          >
            <Search data-icon="inline-start" />
            {open ? "Hide people" : "Explore people"}
          </Button>
        </CardHeader>
        {open && (
          <CardContent className="flex flex-col gap-4">
            <FieldGroup className="grid items-end gap-3 sm:grid-cols-[1fr_220px]">
              <PeopleSearch
                value={params.get("search") ?? ""}
                onCommit={(search) => update({ search, page: null }, true)}
              />
              <LabeledSelect
                id="people-sort"
                label="Sort people"
                value={params.get("sort") ?? "registered_desc"}
                onChange={(sort) => update({ sort, page: null })}
                items={[
                  { value: "registered_desc", label: "Newest profile date" },
                  { value: "registered_asc", label: "Oldest profile date" },
                  { value: "name_asc", label: "Name A–Z" },
                  { value: "name_desc", label: "Name Z–A" },
                  { value: "age_asc", label: "Youngest first" },
                  { value: "age_desc", label: "Oldest first" },
                ]}
              />
            </FieldGroup>
            {params.has("search") && data?.total !== 0 && (
              <div>
                <Button variant="secondary" size="sm" onClick={clearSearch}>
                  Clear search
                </Button>
              </div>
            )}
            {query.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p>{query.error.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void query.refetch()}
                  >
                    Retry people
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update({
                        search: null,
                        sort: null,
                        page: null,
                        pageSize: null,
                      })
                    }
                  >
                    Reset table filters
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {query.isPending && <PeopleTableSkeleton />}
            {data && (
              <>
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-wrap justify-between gap-2 text-sm"
                >
                  <span>
                    <strong>{data.total.toLocaleString("en-US")}</strong>{" "}
                    matching people
                  </span>
                  <span className="text-muted-foreground">
                    {query.isFetching
                      ? "Updating people… Previous results remain visible."
                      : data.total > 0
                        ? `Page ${data.page} of ${data.pageCount}`
                        : null}
                  </span>
                </div>
                <Sheet
                  open={!!selected}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) setSelected(null);
                  }}
                >
                  {data.total > 0 && (
                    <TableComponent
                      items={data.items}
                      busy={query.isFetching}
                      onSelect={setSelected}
                    />
                  )}
                  <SheetContent>
                    {selected && (
                      <PersonDetails
                        key={selected.login.uuid}
                        selected={selected}
                      />
                    )}
                  </SheetContent>
                </Sheet>
                {data.total === 0 && (
                  <Empty
                    className="border py-10"
                    data-testid="people-empty-state"
                  >
                    <EmptyHeader>
                      <EmptyMedia>
                        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/5 text-primary">
                          <SearchX className="size-6" aria-hidden="true" />
                        </div>
                      </EmptyMedia>
                      <EmptyTitle>
                        <h3>No matching people</h3>
                      </EmptyTitle>
                      <EmptyDescription>
                        {params.get("search")
                          ? "Try a different name, email, or location, or clear your search. Your report filters will stay the same."
                          : "No profiles match the current report filters. Adjust the filters above to broaden your selection."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {params.has("search") && (
                      <EmptyContent>
                        <Button onClick={clearSearch}>Clear search</Button>
                      </EmptyContent>
                    )}
                  </Empty>
                )}
                {data.total > 0 && (
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="w-32">
                      <LabeledSelect
                        id="page-size"
                        label="Rows per page"
                        value={String(data.pageSize)}
                        items={TABLE_PAGE_SIZES.map((n) => ({
                          value: String(n),
                          label: n.toLocaleString("en-US"),
                        }))}
                        onChange={(pageSize) => {
                          measurePageSize(Number(pageSize));
                          update({ pageSize, page: null });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page <= 1 || query.isFetching}
                        onClick={() => update({ page: String(data.page - 1) })}
                      >
                        <ChevronLeft data-icon="inline-start" />
                        Previous
                      </Button>
                      <span className="text-sm tabular-nums">
                        {data.page} / {data.pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          data.page >= data.pageCount || query.isFetching
                        }
                        onClick={() => update({ page: String(data.page + 1) })}
                      >
                        Next
                        <ChevronRight data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
