import { init, use, type EChartsType, type ComposeOption } from "echarts/core";
import {
  type MapSeriesOption,
  type BarSeriesOption,
  type PieSeriesOption,
  type RadarSeriesOption,
  type HeatmapSeriesOption,
} from "echarts/charts";
import {
  DatasetComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
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
  DatasetComponent,
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
