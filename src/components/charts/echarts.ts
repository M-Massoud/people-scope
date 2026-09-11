import { init, use, type EChartsType, type ComposeOption } from "echarts/core";
import {
  BarChart,
  PieChart,
  RadarChart,
  type BarSeriesOption,
  type PieSeriesOption,
  type RadarSeriesOption,
} from "echarts/charts";
import {
  DatasetComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  RadarComponent,
  type DatasetComponentOption,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type AriaComponentOption,
  type RadarComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Tree-shakable entry point: registering a chart type and its renderer is explicit.
use([
  BarChart,
  PieChart,
  RadarChart,
  RadarComponent,
  DatasetComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  CanvasRenderer,
]);
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | PieSeriesOption
  | RadarSeriesOption
  | RadarComponentOption
  | DatasetComponentOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | AriaComponentOption
>;
export { init, type EChartsType };
