import type { AgeRow, TimelineRow } from "../types";
import type { CountryRow } from "@/modules/people";
import { CHART_COLORS, type ChartOption } from "@/components/charts";

const continentColors: Record<string, string> = {
  Europe: CHART_COLORS[0],
  Asia: CHART_COLORS[1],
  "North America": CHART_COLORS[2],
  "South America": CHART_COLORS[4],
  Oceania: CHART_COLORS[3],
  Africa: "#6c9141",
  Antarctica: "#78879f",
  Unmapped: "#78879f",
};

const base: ChartOption = {
  animation: true,
  color: CHART_COLORS,
  textStyle: {
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

export function timelineOption(rows: TimelineRow[]): ChartOption {
  return {
    ...bars,
    dataset: {
      id: "profile-timeline",
      dimensions: ["key", "label", "from", "to", "count"],
      source: rows.map((row) => ({ ...row })),
    },
    series: [
      {
        id: "profile-timeline-count",
        name: "Profiles",
        type: "bar",
        barMaxWidth: 52,
        encode: {
          x: "label",
          y: "count",
          itemId: "key",
          itemName: "label",
          tooltip: ["count"],
        },
        itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: "self" },
      },
    ],
  };
}

export function ageGroupsOption(rows: AgeRow[]): ChartOption {
  return {
    ...bars,
    dataset: {
      id: "age-groups",
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
        itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: "self" },
      },
    ],
  };
}

export function ageGenderOption(rows: AgeRow[]): ChartOption {
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
      id: "age-gender",
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
      itemStyle: { color, borderRadius: [4, 4, 0, 0] },
      emphasis: { focus: "series" },
    })),
  };
}

export function geographyOption(rows: CountryRow[]): ChartOption {
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
      id: "geography",
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
        itemStyle: {
          borderWidth: 3,
          borderColor: "#fff",
          borderRadius: 5,
          // A continent keeps its color when filtering changes the slice order.
          color: (params) =>
            continentColors[params.name] ??
            CHART_COLORS[params.dataIndex % CHART_COLORS.length],
        },
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
