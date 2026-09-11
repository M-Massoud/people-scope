"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui";
import { LabeledSelect } from "./labeled-select";
// Calendar dates stay local civil dates. ISO timestamps would shift days across time zones.
export const calendarDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const dateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function DatePicker({
  id,
  label,
  value,
  min,
  max,
  onChange,
  invalid = false,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = calendarDate(value);
  const [month, setMonth] = useState(date);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            id={id}
            aria-label={label}
            aria-invalid={invalid}
            aria-describedby={invalid ? "date-error" : undefined}
            data-value={value}
            className="w-full justify-start"
          />
        }
      >
        <CalendarDays data-icon="inline-start" />
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        aria-label={`Choose ${label.toLowerCase()}`}
      >
        <PopoverTitle className="sr-only">
          Choose {label.toLowerCase()}
        </PopoverTitle>
        <div className="border-b p-3">
          <LabeledSelect
            id={`${id}-year`}
            label="Calendar year"
            value={String(month.getFullYear())}
            items={Array.from(
              { length: Number(max.slice(0, 4)) - Number(min.slice(0, 4)) + 1 },
              (_, index) => {
                const year = String(Number(min.slice(0, 4)) + index);
                return { value: year, label: year };
              },
            )}
            onChange={(year) => {
              let next = new Date(Number(year), month.getMonth(), 1);
              if (dateValue(next).slice(0, 7) < min.slice(0, 7))
                next = calendarDate(min);
              if (dateValue(next).slice(0, 7) > max.slice(0, 7))
                next = calendarDate(max);
              setMonth(next);
            }}
          />
        </div>
        <Calendar
          autoFocus
          mode="single"
          selected={date}
          month={month}
          onMonthChange={setMonth}
          startMonth={calendarDate(min)}
          endMonth={calendarDate(max)}
          disabled={{ before: calendarDate(min), after: calendarDate(max) }}
          onSelect={(next) => {
            if (next) {
              onChange(dateValue(next));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
