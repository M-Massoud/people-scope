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
  ScrollArea,
  ScrollBar,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { LabeledSelect } from "@/components/form-fields";
import type { Person } from "../types";
import { usePeoplePage } from "../hooks";
import { PeopleTableSkeleton } from "./people-table-skeleton";
import { PersonAvatar } from "./person-avatar";

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
  const open = params.get("explore") === "1";
  const query = usePeoplePage(params, open);
  const data = query.data;
  const [selected, setSelected] = useState<Person | null>(null);
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
                    <ScrollArea
                      data-testid="people-scroll-area"
                      aria-busy={query.isFetching}
                      role="region"
                      aria-label="Scrollable people table"
                      className="isolate h-[420px] min-w-0 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-3"
                    >
                      <Table
                        data-testid="people-table"
                        scrollable={false}
                        className="min-w-[900px]"
                      >
                        <TableHeader>
                          <TableRow>
                            {[
                              "Name",
                              "Email",
                              "Country / city",
                              "Gender",
                              "Age",
                              "Profile date",
                            ].map((label) => (
                              <TableHead
                                key={label}
                                className="sticky top-0 z-10 bg-card"
                              >
                                {label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.items.map((person) => (
                            <TableRow key={person.login.uuid}>
                              <TableCell>
                                <SheetTrigger
                                  render={
                                    <Button
                                      variant="link"
                                      className="h-auto justify-start p-0 text-left"
                                    />
                                  }
                                  onClick={() => setSelected(person)}
                                >
                                  <PersonAvatar person={person} />
                                  <span>
                                    {person.name.first} {person.name.last}
                                  </span>
                                </SheetTrigger>
                              </TableCell>
                              <TableCell>{person.email}</TableCell>
                              <TableCell>
                                <div>{person.location.country}</div>
                                <div className="text-xs text-muted-foreground">
                                  {person.location.city}
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">
                                {person.gender}
                              </TableCell>
                              <TableCell>{person.dob.age}</TableCell>
                              <TableCell>
                                {person.registered.date.slice(0, 10)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                  <SheetContent>
                    <SheetHeader>
                      {selected && (
                        <PersonAvatar
                          key={selected.login.uuid}
                          person={selected}
                          large
                        />
                      )}
                      <SheetTitle>
                        {selected
                          ? `${selected.name.first} ${selected.name.last}`
                          : "Person details"}
                      </SheetTitle>
                      <SheetDescription>
                        Contact information and profile details.
                      </SheetDescription>
                    </SheetHeader>
                    <ScrollArea
                      className="min-h-0 flex-1"
                      role="region"
                      aria-label="Profile details"
                    >
                      {selected && (
                        <div className="px-4 pb-6">
                          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Object.entries({
                              Email: selected.email,
                              Phone: selected.phone,
                              Country: selected.location.country,
                              State: selected.location.state,
                              City: selected.location.city,
                              Nationality: selected.nat,
                              "Provider ID": selected.id.value?.trim()
                                ? `${selected.id.name || "ID"} · ${selected.id.value}`
                                : "Not provided",
                              Gender: selected.gender,
                              Age: selected.dob.age,
                              "Date of birth": selected.dob.date.slice(0, 10),
                              "Profile date (UTC)":
                                selected.registered.date.slice(0, 10),
                            }).map(([label, value]) => (
                              <div
                                key={label}
                                className={
                                  label === "Email"
                                    ? "min-w-0 sm:col-span-2"
                                    : "min-w-0"
                                }
                              >
                                <dt className="text-xs text-muted-foreground">
                                  {label}
                                </dt>
                                <dd className="mt-1 break-words text-sm">
                                  {value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </ScrollArea>
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
                        items={[10, 25, 50, 100].map((n) => ({
                          value: String(n),
                          label: String(n),
                        }))}
                        onChange={(pageSize) =>
                          update({ pageSize, page: null })
                        }
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
