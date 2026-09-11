import type { ChartOption } from "@/components/charts";
import type {
  HeatmapAgeGroup,
  HeatmapMetric,
  HeatmapOrder,
  HeatmapRow,
  HeatmapSelection,
} from "../types";

export function sortHeatmapRows(
  rows: HeatmapRow[],
  order: HeatmapOrder,
): HeatmapRow[] {
  const olderShare = (row: HeatmapRow) =>
    row.cells.slice(6).reduce((sum, cell) => sum + cell.percentage, 0);
  return [...rows].sort((a, b) => {
    const difference =
      order === "size"
        ? b.total - a.total
        : order === "older"
          ? olderShare(b) - olderShare(a)
          : 0;
    return difference || a.country.localeCompare(b.country, "en");
  });
}

export function heatmapScale(rows: HeatmapRow[], metric: HeatmapMetric) {
  const peak = Math.max(
    0,
    ...rows.flatMap((row) =>
      row.cells.map((cell) =>
        metric === "share" ? cell.percentage : cell.count,
      ),
    ),
  );
  return metric === "share"
    ? Math.max(10, Math.ceil(peak / 10) * 10)
    : Math.max(1, peak);
}

export function heatmapOption(
  rows: HeatmapRow[],
  ageGroups: HeatmapAgeGroup[],
  metric: HeatmapMetric,
  selected?: HeatmapSelection,
): ChartOption {
  const max = heatmapScale(rows, metric);
  const count = (value: number) => value.toLocaleString("en-US");
  return {
    animation: false,
    textStyle: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: 12 },
    grid: { left: 144, right: 24, top: 38, bottom: 76 },
    xAxis: {
      type: "category",
      data: ageGroups.map((group) => group.label),
      position: "top",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { interval: 0, color: "#596774", margin: 14 },
      splitArea: { show: false },
    },
    yAxis: {
      type: "category",
      data: rows.map((row) => row.country),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        interval: 0,
        color: "#334451",
        margin: 12,
        width: 130,
        overflow: "truncate",
      },
    },
    visualMap: {
      type: "continuous",
      min: 0,
      max,
      dimension: 2,
      orient: "horizontal",
      left: "center",
      bottom: 10,
      itemWidth: 10,
      itemHeight: 180,
      calculable: false,
      text: [metric === "share" ? `${max}%` : count(max), "0"],
      textStyle: { color: "#596774", fontSize: 11 },
      inRange: { color: ["#f0f5fa", "#b6cde3", "#608db6", "#234f78"] },
    },
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      confine: true,
      backgroundColor: "#ffffff",
      borderColor: "#d9dde3",
      textStyle: { color: "#253040", fontSize: 12 },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const row = rows[Math.floor(point.dataIndex / ageGroups.length)];
        const column = point.dataIndex % ageGroups.length;
        if (!row || !ageGroups[column]) return "";
        const cell = row.cells[column];
        return `${row.country} · ${ageGroups[column].label} years\n${count(cell.count)} people · ${cell.percentage.toFixed(1)}% of country\nCountry sample: ${count(row.total)}${cell.count ? "\nClick to explore these people" : "\nNo people in this age group"}`;
      },
    },
    series: [
      {
        id: "country-age-matrix",
        type: "heatmap",
        data: rows.flatMap((row, rowIndex) =>
          row.cells.map((cell, column) => {
            const value = metric === "share" ? cell.percentage : cell.count;
            const active =
              selected?.country === row.country &&
              selected.ageKey === ageGroups[column].key;
            return {
              value: [column, rowIndex, value],
              label: {
                show: true,
                formatter:
                  cell.count === 0
                    ? "—"
                    : metric === "share"
                      ? `${cell.percentage.toFixed(1)}%`
                      : count(cell.count),
                color: value / max > 0.6 ? "#ffffff" : "#334451",
                fontSize: 11,
              },
              itemStyle: {
                borderColor: active ? "#172f45" : "#ffffff",
                borderWidth: active ? 3 : 2,
              },
            };
          }),
        ),
        emphasis: { itemStyle: { borderColor: "#172f45", borderWidth: 2 } },
      },
    ],
  };
}
