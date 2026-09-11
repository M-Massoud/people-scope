import type { CountryAgeGroup } from "../types";
import { CHART_COLORS, type ChartOption } from "@/components/charts";

export function comparisonScale(groups: CountryAgeGroup[]) {
  const peak = Math.max(
    0,
    ...groups.flatMap((group) => group.ages.map((age) => age.percentage)),
  );
  return Math.max(10, Math.ceil(peak / 10) * 10);
}

export function comparisonOption(
  groups: CountryAgeGroup[],
  view: "bar" | "radar",
): ChartOption {
  const max = comparisonScale(groups);
  const labels = groups[0]?.ages.map((age) => age.label) ?? [];
  const formatAge = (group: CountryAgeGroup, index: number) => {
    const age = group.ages[index];
    return `${age.label}: ${age.percentage.toFixed(1)}% (${age.count.toLocaleString("en-US")} people)`;
  };
  const base: ChartOption = {
    animation: true,
    color: CHART_COLORS,
    textStyle: {
      fontSize: 11,
      color: "#67717e",
    },
    legend: {
      top: 0,
      left: "center",
      selectedMode: false,
      itemWidth: 12,
      itemHeight: 9,
    },
    tooltip: {
      trigger: view === "radar" ? "item" : "axis",
      renderMode: "richText",
      confine: true,
      backgroundColor: "#fff",
      borderColor: "#d9dde5",
      textStyle: { color: "#253040", fontSize: 12 },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        if (view === "radar") {
          const group = groups[item.dataIndex];
          return group
            ? [
                group.country,
                ...group.ages.map((_, index) => formatAge(group, index)),
              ].join("\n")
            : "";
        }
        return groups
          .map(
            (group) => `${group.country}\n${formatAge(group, item.dataIndex)}`,
          )
          .join("\n\n");
      },
    },
  };
  if (view === "radar")
    return {
      ...base,
      radar: {
        indicator: labels.map((name) => ({ name, min: 0, max })),
        center: ["50%", "55%"],
        radius: "60%",
        splitNumber: 4,
        axisName: { color: "#67717e", fontSize: 11 },
        axisLine: { lineStyle: { color: "#d9dee5" } },
        splitLine: { lineStyle: { color: "#e4e8ed" } },
        splitArea: { show: false },
      },
      series: [
        {
          id: "country-age-radar",
          type: "radar",
          symbolSize: 5,
          data: groups.map((group, index) => ({
            name: group.country,
            value: group.ages.map((age) => age.percentage),
            lineStyle: { width: 2, type: index === 0 ? "solid" : "dashed" },
            areaStyle: { opacity: 0.07 },
          })),
        },
      ],
    };
  return {
    ...base,
    grid: { left: 8, right: 12, top: 40, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLabel: { hideOverlap: true },
      axisLine: { lineStyle: { color: "#d9dee5" } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max,
      axisLabel: { formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#edf0f3" } },
    },
    series: groups.map((group, index) => ({
      id: `country-age-${index}`,
      name: group.country,
      type: "bar",
      barMaxWidth: 25,
      data: group.ages.map((age) => age.percentage),
    })),
  };
}
