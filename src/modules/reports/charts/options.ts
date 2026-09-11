import type { AgeRow, TimelineRow } from "../types";
import type { CountryRow } from "@/modules/people";
import { CHART_COLORS, type ChartOption } from "@/components/charts";

const base: ChartOption = {
  animation: false,
  color: CHART_COLORS,
  textStyle: {
    fontFamily: "IBM Plex Sans, sans-serif",
    fontSize: 11,
    color: "#67717e",
  },
  tooltip: {
    trigger: "axis",
    renderMode: "richText",
    confine: true,
    backgroundColor: "#fff",
    borderColor: "#d9dde3",
    textStyle: { color: "#253040", fontSize: 12 },
  },
};

const bars: ChartOption = {
  ...base,
  grid: { left: 12, right: 16, top: 24, bottom: 12, containLabel: true },
  xAxis: {
    type: "category",
    axisTick: { show: false },
    axisLine: { lineStyle: { color: "#d9dee5" } },
    axisLabel: { hideOverlap: true, width: 72, overflow: "truncate" },
  },
  yAxis: {
    type: "value",
    min: 0,
    minInterval: 1,
    splitLine: { lineStyle: { color: "#edf0f3" } },
  },
};

export function registrationOption(rows: TimelineRow[]): ChartOption {
  return {
    ...bars,
    dataset: {
      id: "registrations",
      dimensions: ["key", "label", "from", "to", "count"],
      source: rows.map((row) => ({ ...row })),
    },
    series: [
      {
        id: "registration-count",
        name: "People registered",
        type: "bar",
        barMaxWidth: 52,
        encode: {
          x: "label",
          y: "count",
          itemId: "key",
          itemName: "label",
          tooltip: ["count"],
        },
        itemStyle: { color: CHART_COLORS[0] },
      },
    ],
  };
}

export function ageOption(rows: AgeRow[]): ChartOption {
  return {
    ...bars,
    dataset: {
      id: "ages",
      dimensions: ["key", "label", "min", "max", "total", "male", "female"],
      source: rows.map((row) => ({ ...row })),
    },
    series: [
      {
        id: "age-total",
        name: "People",
        type: "bar",
        barMaxWidth: 52,
        encode: {
          x: "label",
          y: "total",
          itemId: "key",
          itemName: "label",
          tooltip: ["total"],
        },
        itemStyle: { color: CHART_COLORS[0] },
      },
    ],
  };
}

export function demographicOption(rows: AgeRow[]): ChartOption {
  return {
    ...bars,
    grid: { left: 12, right: 16, top: 48, bottom: 12, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      icon: "rect",
      itemWidth: 10,
      itemHeight: 10,
      selectedMode: false,
    },
    dataset: {
      id: "demographics",
      dimensions: ["key", "label", "min", "max", "total", "male", "female"],
      source: rows.map((row) => ({ ...row })),
    },
    series: [
      {
        id: "demographic-male",
        name: "Male",
        dimension: "male",
        color: CHART_COLORS[0],
      },
      {
        id: "demographic-female",
        name: "Female",
        dimension: "female",
        color: CHART_COLORS[1],
      },
    ].map(({ id, name, dimension, color }) => ({
      id,
      name,
      type: "bar" as const,
      barMaxWidth: 28,
      encode: {
        x: "label",
        y: dimension,
        itemId: "key",
        itemName: "label",
        tooltip: [dimension],
      },
      itemStyle: { color },
    })),
  };
}

export function countryOption(rows: CountryRow[]): ChartOption {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return {
    ...base,
    legend: {
      type: "scroll",
      bottom: 0,
      left: "center",
      width: "94%",
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 10,
      itemGap: 16,
      selectedMode: false,
      data: rows.map((row) => row.name),
    },
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      confine: true,
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const row = rows[item.dataIndex];
        if (!row) return "";
        const share = total > 0 ? (row.count / total) * 100 : 0;
        return `${row.name}: ${row.count.toLocaleString("en-US")} people (${share.toFixed(1)}%)`;
      },
    },
    dataset: {
      id: "countries",
      dimensions: ["name", "count"],
      source: rows.map((row) => ({ ...row })),
    },
    series: [
      {
        id: "country-count",
        name: "People by country",
        type: "pie",
        radius: ["44%", "66%"],
        center: ["50%", "45%"],
        stillShowZeroSum: false,
        showEmptyCircle: false,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { label: { show: false }, scaleSize: 4 },
        itemStyle: { borderWidth: 2, borderColor: "#fff" },
        encode: {
          itemName: "name",
          itemId: "name",
          value: "count",
          tooltip: ["count"],
        },
      },
    ],
  };
}
