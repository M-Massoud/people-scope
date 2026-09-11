"use client";
import {
  Button,
  ScrollArea,
  ScrollBar,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { PeopleReport, PeopleReportKind } from "../types";
import { groupByContinent } from "@/modules/people";
export function ReportDataTable({
  kind,
  data,
  drill,
  disabled,
  geography = "country",
}: {
  kind: PeopleReportKind;
  data: PeopleReport;
  drill: (patch: Record<string, string | null>) => void;
  disabled: boolean;
  geography?: "country" | "continent";
}) {
  const headers =
    kind === "profile-timeline"
      ? [data.grouping === "year" ? "Year" : "Month", "People"]
      : kind === "geography"
        ? [
            geography === "continent" ? "Continent" : "Country",
            "People",
            "Share",
          ]
        : kind === "age-gender"
          ? ["Age group", "Male", "Female"]
          : ["Age group", "People"];
  const count = (n: number) => n.toLocaleString("en-US");
  return (
    <ScrollArea
      data-testid="report-scroll-area"
      className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-3"
      role="region"
      aria-label="Scrollable report data"
    >
      <Table data-testid="report-table" scrollable={false}>
        <TableCaption className="sr-only">
          Report data. Select a value to explore matching people.
        </TableCaption>
        <TableHeader>
          <TableRow>
            {headers.map((label, i) => (
              <TableHead
                key={label}
                className={`sticky top-0 bg-card whitespace-normal ${i ? "text-right" : ""}`}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {kind === "profile-timeline" &&
            data.timeline.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <Button
                    disabled={disabled}
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    aria-label={`View profiles from ${row.label}`}
                    onClick={() => drill({ from: row.from, to: row.to })}
                  >
                    {row.label}
                  </Button>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {count(row.count)}
                </TableCell>
              </TableRow>
            ))}
          {kind === "geography" &&
            (geography === "continent"
              ? groupByContinent(data.countries)
              : data.countries
            ).map((row) => (
              <TableRow key={row.name}>
                <TableCell>
                  <Button
                    disabled={disabled}
                    variant="link"
                    size="sm"
                    className="h-auto whitespace-normal p-0 text-left"
                    aria-label={`View people in ${row.name}`}
                    onClick={() =>
                      drill(
                        geography === "continent"
                          ? { continent: row.name, country: null }
                          : { country: row.name },
                      )
                    }
                  >
                    {row.name}
                  </Button>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {count(row.count)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {((row.count / data.metrics.totalPeople) * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          {(kind === "age-groups" || kind === "age-gender") &&
            data.ages.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <Button
                    disabled={disabled || row.total === 0}
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    aria-label={`View ages ${row.label}`}
                    onClick={() =>
                      drill({
                        ageMin: String(row.min),
                        ageMax: String(row.max),
                      })
                    }
                  >
                    {row.label}
                  </Button>
                </TableCell>
                {kind === "age-groups" ? (
                  <TableCell className="text-right tabular-nums">
                    {count(row.total)}
                  </TableCell>
                ) : (
                  (["male", "female"] as const).map((gender) => (
                    <TableCell key={gender} className="text-right tabular-nums">
                      <Button
                        disabled={disabled || row[gender] === 0}
                        variant="link"
                        size="sm"
                        className="h-auto p-0 tabular-nums"
                        aria-label={`View ${gender} ages ${row.label}`}
                        onClick={() =>
                          drill({
                            ageMin: String(row.min),
                            ageMax: String(row.max),
                            gender,
                          })
                        }
                      >
                        {count(row[gender])}
                      </Button>
                    </TableCell>
                  ))
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
