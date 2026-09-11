import { describe, expect, it } from "vitest";
import type { BarSeriesOption, PieSeriesOption } from "echarts/charts";
import {
  ageOption,
  countryOption,
  demographicOption,
  registrationOption,
} from "../src/components/charts/people-options";
import type { AgeRow } from "../src/lib/people-types";

const ages: AgeRow[] = [
  {
    key: "30-39",
    label: "30–39",
    min: 30,
    max: 39,
    total: 5,
    male: 2,
    female: 3,
  },
  {
    key: "20-29",
    label: "20–29",
    min: 20,
    max: 29,
    total: 0,
    male: 0,
    female: 0,
  },
];

describe("people chart contracts", () => {
  it("retains registration date buckets and their counts in selectable input order", () => {
    const rows = [
      {
        key: "2024",
        label: "2024",
        from: "2024-01-01",
        to: "2024-12-31",
        count: 0,
      },
      {
        key: "2023",
        label: "2023",
        from: "2023-01-01",
        to: "2023-12-31",
        count: 9,
      },
    ];
    const option = registrationOption(rows);
    expect(option.dataset).toMatchObject({ source: rows });
    expect(option.xAxis).toMatchObject({ type: "category" });
    expect(option.yAxis).toMatchObject({
      type: "value",
      min: 0,
      minInterval: 1,
    });
    expect(option.series).toEqual([
      expect.objectContaining({
        type: "bar",
        encode: expect.objectContaining({
          x: "label",
          y: "count",
          itemId: "key",
        }),
      }),
    ]);
  });

  it("plots age totals without losing empty buckets or their selectable identity", () => {
    const option = ageOption(ages);
    expect(option.dataset).toMatchObject({ source: ages });
    expect(option.yAxis).toMatchObject({
      type: "value",
      min: 0,
      minInterval: 1,
    });
    expect(option.series).toEqual([
      expect.objectContaining({
        type: "bar",
        encode: expect.objectContaining({
          x: "label",
          y: "total",
          itemId: "key",
        }),
      }),
    ]);
  });

  it("groups actual male and female counts on one shared count scale", () => {
    const option = demographicOption(ages);
    const series = option.series as BarSeriesOption[];
    expect(option.dataset).toMatchObject({ source: ages });
    expect(option.yAxis).toMatchObject({
      type: "value",
      min: 0,
      minInterval: 1,
    });
    expect(Array.isArray(option.yAxis)).toBe(false);
    expect(series).toHaveLength(2);
    expect(series).toEqual([
      expect.objectContaining({
        name: "Male",
        type: "bar",
        encode: expect.objectContaining({
          x: "label",
          y: "male",
          itemId: "key",
        }),
      }),
      expect.objectContaining({
        name: "Female",
        type: "bar",
        encode: expect.objectContaining({
          x: "label",
          y: "female",
          itemId: "key",
        }),
      }),
    ]);
    expect(series.every((entry) => !entry.stack && !entry.yAxisIndex)).toBe(
      true,
    );
    expect(new Set(series.map((entry) => entry.id)).size).toBe(2);
    expect(
      (demographicOption([]).series as BarSeriesOption[]).map(
        (entry) => entry.id,
      ),
    ).toEqual(series.map((entry) => entry.id));
  });

  it("retains all 21 country counts without sorting, truncation, or an invented Other group", () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      name: `Country ${21 - index}`,
      count: index + 1,
    }));
    const option = countryOption(rows);
    expect(option.dataset).toMatchObject({ source: rows });
    expect(option.series).toEqual([
      expect.objectContaining({
        type: "pie",
        encode: expect.objectContaining({
          itemName: "name",
          value: "count",
          itemId: "name",
        }),
      }),
    ]);
    const series = (option.series as PieSeriesOption[])[0];
    expect(series.radius).toEqual([expect.any(String), expect.any(String)]);
    expect(option.legend).toMatchObject({
      type: "scroll",
      selectedMode: false,
      data: rows.map((row) => row.name),
    });
    expect(option.tooltip).toMatchObject({
      trigger: "item",
      renderMode: "richText",
      confine: true,
    });
  });

  it("does not turn an empty country sample into equal-size slices", () => {
    const option = countryOption([
      { name: "Canada", count: 0 },
      { name: "Brazil", count: 0 },
    ]);
    expect((option.series as PieSeriesOption[])[0].stillShowZeroSum).toBe(
      false,
    );
    expect(countryOption([]).dataset).toMatchObject({ source: [] });
  });

  it("formats a country dataset row as its full name, count, and share", () => {
    const option = countryOption([
      { name: "United Kingdom", count: 3 },
      { name: "Canada", count: 1 },
    ]);
    const tooltip = option.tooltip as {
      formatter: (params: { dataIndex: number }) => string;
    };
    expect(typeof tooltip.formatter).toBe("function");
    expect(tooltip.formatter({ dataIndex: 0 })).toBe(
      "United Kingdom: 3 people (75.0%)",
    );
  });

  it("uses canvas tooltips and stable IDs across filtered registration and age updates", () => {
    for (const build of [registrationOption, ageOption]) {
      const option = build([]);
      const series = option.series as BarSeriesOption[];
      expect(series[0].id).toBeTruthy();
      expect(option.tooltip).toMatchObject({
        renderMode: "richText",
        confine: true,
      });
    }
    expect((ageOption(ages).series as BarSeriesOption[])[0].id).toBe(
      (ageOption([]).series as BarSeriesOption[])[0].id,
    );
  });
});
