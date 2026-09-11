"use client";
import { useState } from "react";
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui";
import { DatePicker, LabeledSelect } from "@/components/form-fields";
import type { PeopleFilters } from "@/modules/people";

export function Filters({
  value,
  countries,
  availablePeriod,
  onChange,
  onReset,
}: {
  value: PeopleFilters;
  countries: string[];
  availablePeriod: { from: string; to: string };
  onChange: (filters: PeopleFilters) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const periodFor = (years: number) => {
    const end = new Date(`${availablePeriod.to}T00:00:00Z`);
    const from = new Date(
      Date.UTC(end.getUTCFullYear() - years, end.getUTCMonth() + 1, 1),
    )
      .toISOString()
      .slice(0, 10);
    return {
      from: from < availablePeriod.from ? availablePeriod.from : from,
      to: availablePeriod.to,
    };
  };
  const ranges = [
    { key: "all", label: "All time", ...availablePeriod },
    { key: "5", label: "Latest 5 years", ...periodFor(5) },
    { key: "1", label: "Latest 12 months", ...periodFor(1) },
  ];
  const activeRange = ranges.find(
    (r) => draft.from === r.from && draft.to === r.to,
  )?.key;
  return (
    <section className="filter-panel" aria-label="People filters">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.from > draft.to) {
            setError("Start date must be on or before end date.");
            return;
          }
          if (
            draft.ageMin !== "" &&
            draft.ageMax !== "" &&
            Number(draft.ageMin) > Number(draft.ageMax)
          ) {
            setError("Minimum age must not exceed maximum age.");
            return;
          }
          setError("");
          onChange(draft);
        }}
      >
        <FieldGroup className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <LabeledSelect
            id="country"
            label="Country"
            value={draft.country}
            items={[
              { value: "all", label: "All countries" },
              ...countries.map((country) => ({
                value: country,
                label: country,
              })),
            ]}
            onChange={(country) => setDraft({ ...draft, country })}
          />
          <LabeledSelect
            id="gender"
            label="Gender"
            value={draft.gender}
            items={[
              { value: "all", label: "All genders" },
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
            ]}
            onChange={(gender) =>
              setDraft({ ...draft, gender: gender as PeopleFilters["gender"] })
            }
          />
          {(["ageMin", "ageMax"] as const).map((key) => (
            <Field key={key} data-invalid={!!error}>
              <FieldLabel htmlFor={key}>
                {key === "ageMin" ? "Minimum age" : "Maximum age"}
              </FieldLabel>
              <Input
                id={key}
                type="number"
                min={0}
                max={120}
                step={1}
                placeholder="Any"
                value={draft[key]}
                aria-invalid={!!error}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
              />
            </Field>
          ))}
          {(["from", "to"] as const).map((key) => (
            <Field key={key} data-invalid={!!error} className="min-w-0">
              <FieldLabel htmlFor={`${key}-date`}>
                {key === "from" ? "Registered from" : "Registered to"}
              </FieldLabel>
              <DatePicker
                key={`${key}-${draft[key]}`}
                id={`${key}-date`}
                label={key === "from" ? "Registered from" : "Registered to"}
                value={draft[key]}
                min={availablePeriod.from}
                max={availablePeriod.to}
                invalid={!!error}
                onChange={(date) => setDraft({ ...draft, [key]: date })}
              />
            </Field>
          ))}
        </FieldGroup>
        <div className="filter-actions">
          <div className="flex flex-wrap items-center gap-2">
            <span className="filter-hint">Registration range</span>
            <ToggleGroup
              aria-label="Registration range"
              size="sm"
              spacing={1}
              value={activeRange ? [activeRange] : []}
              onValueChange={(keys) => {
                const range = ranges.find((r) => r.key === keys[0]);
                if (range) {
                  const next = { ...draft, from: range.from, to: range.to };
                  setDraft(next);
                  setError("");
                }
              }}
            >
              {ranges.map((range) => (
                <ToggleGroupItem
                  type="button"
                  key={range.key}
                  value={range.key}
                >
                  {range.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft({
                  ...availablePeriod,
                  country: "all",
                  gender: "all",
                  ageMin: "",
                  ageMax: "",
                });
                setError("");
                onReset();
              }}
            >
              Reset filters
            </Button>
            <Button type="submit" size="sm">
              Apply filters
            </Button>
          </div>
        </div>
        {error && (
          <FieldError id="date-error" className="mt-3">
            {error}
          </FieldError>
        )}
      </form>
    </section>
  );
}
