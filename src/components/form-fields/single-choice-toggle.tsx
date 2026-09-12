"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui";

type SingleChoiceToggleProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  variant?: "default" | "outline";
  spacing?: number;
};

export function SingleChoiceToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  variant,
  spacing,
}: SingleChoiceToggleProps<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      size="sm"
      variant={variant}
      spacing={spacing}
      value={[value]}
      onValueChange={(values) => {
        const option = options.find((option) => option.value === values[0]);
        if (option) onChange(option.value);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
