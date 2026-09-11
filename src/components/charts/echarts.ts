import { init, use, type EChartsType, type ComposeOption } from "echarts/core";
import {
  BarChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  type MapSeriesOption,
  type BarSeriesOption,
  type PieSeriesOption,
  type RadarSeriesOption,
  type HeatmapSeriesOption,
} from "echarts/charts";
import {
  DatasetComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  RadarComponent,
  VisualMapComponent,
  type DatasetComponentOption,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type AriaComponentOption,
  type RadarComponentOption,
  type VisualMapComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Tree-shakable entry point: registering a chart type and its renderer is explicit.
use([
  BarChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  RadarComponent,
  VisualMapComponent,
  DatasetComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  CanvasRenderer,
]);
export type ChartOption = ComposeOption<
  | MapSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | RadarSeriesOption
  | HeatmapSeriesOption
  | VisualMapComponentOption
  | RadarComponentOption
  | DatasetComponentOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | AriaComponentOption
>;
export { init, type EChartsType };
