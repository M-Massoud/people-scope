import type { ChartOption } from "@/components/charts";
import type { HeatmapRow } from "../types";

export type WorldMetric = "count" | "age";
export const WORLD_MAP = "peoplescope-world";

export function worldMapOption(
  rows: HeatmapRow[],
  metric: WorldMetric,
  selected?: string,
): ChartOption {
  const byCountry = new Map(
    rows.map((row) => [
      row.country === "Türkiye" ? "Turkey" : row.country,
      row,
    ]),
  );
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const values = rows.map((row) =>
    metric === "age" ? row.averageAge : row.total,
  );
  const min =
    metric === "age" && values.length
      ? Math.floor(Math.min(...values) / 10) * 10
      : 0;
  const max = Math.max(
    min + 1,
    metric === "age"
      ? Math.ceil(Math.max(0, ...values) / 10) * 10
      : Math.max(0, ...values),
  );
  return {
    animation: false,
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      confine: true,
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const row = byCountry.get(point.name);
        return row
          ? `${row.country}\n${row.total.toLocaleString("en-US")} people · ${((row.total / total) * 100).toFixed(1)}% of selection\nAverage age: ${row.averageAge.toFixed(1)} years\nClick to explore people`
          : `${point.name}\nNo profiles in this selection`;
      },
    },
    visualMap: {
      type: "continuous",
      min,
      max,
      seriesIndex: 0,
      orient: "horizontal",
      left: "center",
      bottom: 8,
      itemWidth: 10,
      itemHeight: 140,
      calculable: false,
      precision: 0,
      text: [metric === "age" ? `${max} years` : `${max} people`, String(min)],
      inRange: { color: ["#e1edff", "#a1c2f0", "#568be0", "#2859b8"] },
      textStyle: { color: "#627080", fontSize: 11 },
    },
    series: {
      id: "world-countries",
      name: "Countries",
      type: "map",
      map: WORLD_MAP,
      roam: true,
      scaleLimit: { min: 1, max: 12 },
      left: "2%",
      width: "96%",
      top: "20%",
      aspectScale: 1,
      // Omit zoom/center on updates so changing filters preserves the user's viewport.
      label: { show: false },
      itemStyle: {
        areaColor: "#edf0f2",
        borderColor: "#ffffff",
        borderWidth: 0.7,
      },
      emphasis: {
        label: { show: false },
        itemStyle: { borderColor: "#173f63", borderWidth: 1.5 },
      },
      selectedMode: false,
      data: rows.map((row) => ({
        name: row.country === "Türkiye" ? "Turkey" : row.country,
        value: metric === "age" ? row.averageAge : row.total,
        ...(row.country === selected
          ? { itemStyle: { borderColor: "#112f4e", borderWidth: 2 } }
          : {}),
      })),
    },
  };
}
