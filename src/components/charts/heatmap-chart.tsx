"use client";
import { use } from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { VisualMapComponent, GridComponent } from "echarts/components";

use([HeatmapChart, VisualMapComponent, GridComponent]);
export { default } from "./echart";
