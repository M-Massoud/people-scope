"use client";
import { memo, useEffect, useRef } from "react";
import { init, type ChartOption, type EChartsType } from "./echarts";

export type ChartSelection = {
  dataIndex: number;
  seriesName?: string;
  name?: string;
};

type Props = {
  option: ChartOption;
  label: string;
  testId?: string;
  onSelect?: (selection: ChartSelection) => void;
  onReady?: (instance: EChartsType) => void;
};

function EChart({ option, label, testId, onSelect, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const selectionHandler = useRef(onSelect);
  const readyHandler = useRef(onReady);
  const selectable = Boolean(onSelect);

  useEffect(() => {
    selectionHandler.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    const instance = init(element, undefined, { renderer: "canvas" });
    chart.current = instance;
    const handleClick = (selection: ChartSelection) => {
      if (!Number.isInteger(selection.dataIndex) || selection.dataIndex < 0)
        return;
      selectionHandler.current?.({
        dataIndex: selection.dataIndex,
        seriesName: selection.seriesName,
        name: selection.name,
      });
    };
    instance.on("click", { componentType: "series" }, handleClick);
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => instance.resize());
    });
    observer.observe(element);
    readyHandler.current?.(instance);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      instance.off("click", handleClick);
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const series = option.series
      ? (Array.isArray(option.series) ? option.series : [option.series]).map(
          (entry) => ({
            ...entry,
            cursor: selectable ? "pointer" : "default",
          }),
        )
      : [];
    // Updating data does not require destroying the canvas or recreating the chart.
    // Stable IDs preserve matching series; replaceMerge removes unmatched old series.
    chart.current?.setOption(
      // ECharts writes its own aria-label, so pass our concise description through
      // its ARIA configuration instead of relying only on React's DOM attribute.
      {
        ...option,
        series,
        aria: { enabled: true, label: { description: label } },
      },
      { replaceMerge: ["series", "dataset"], lazyUpdate: true },
    );
  }, [option, label, selectable]);

  return (
    <div className="chart-wrapper">
      <div
        ref={host}
        className="echart"
        role="img"
        aria-label={label}
        data-testid={testId}
      />
    </div>
  );
}
export default memo(EChart);
