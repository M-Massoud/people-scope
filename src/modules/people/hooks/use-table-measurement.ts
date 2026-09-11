"use client";

import { useLayoutEffect, useRef } from "react";

// Only Playwright sets this mode before loading a benchmark page.
export function getTableBenchmarkMode() {
  if (typeof window === "undefined") return undefined;
  const mode = (
    window as Window & {
      __PEOPLE_TABLE_BENCHMARK__?: "regular" | "optimized";
    }
  ).__PEOPLE_TABLE_BENCHMARK__;
  return mode === "regular" || mode === "optimized" ? mode : undefined;
}

export function isTableBenchmarkEnabled() {
  return getTableBenchmarkMode() !== undefined;
}

// User Timing entries for automated page-size benchmarks.
// This completion signal does not depend on the number of mounted DOM rows.
export function useTableMeasurement({
  enabled,
  pageSize,
  requestedPageSize,
  ready,
  failed,
}: {
  enabled: boolean;
  pageSize?: number;
  requestedPageSize: number;
  ready: boolean;
  failed: boolean;
}) {
  const recording = enabled && isTableBenchmarkEnabled();
  const pending = useRef<{ start: number; pageSize: number } | null>(null);
  const frames = useRef<number[]>([]);
  const cancelFrames = () => {
    frames.current.forEach(cancelAnimationFrame);
    frames.current = [];
  };

  useLayoutEffect(() => {
    const measurement = pending.current;
    if (
      !recording ||
      failed ||
      (measurement && measurement.pageSize !== requestedPageSize)
    ) {
      pending.current = null;
      cancelFrames();
      return;
    }
    if (!measurement || !ready || pageSize !== measurement.pageSize) return;
    const detail = { pageSize };
    performance.measure("People table: commit", {
      start: measurement.start,
      end: performance.now(),
      detail,
    });
    frames.current = [
      requestAnimationFrame(() => {
        frames.current.push(
          requestAnimationFrame(() => {
            if (pending.current !== measurement) return;
            performance.measure("People table: update", {
              start: measurement.start,
              end: performance.now(),
              detail,
            });
            pending.current = null;
            frames.current = [];
          }),
        );
      }),
    ];
    return cancelFrames;
  }, [recording, failed, pageSize, requestedPageSize, ready]);

  useLayoutEffect(
    () => () => {
      pending.current = null;
      cancelFrames();
    },
    [],
  );

  return (nextPageSize: number) => {
    if (!recording || nextPageSize === pageSize) return;
    cancelFrames();
    // Bound the benchmark timing buffer during repeated runs.
    for (const name of [
      "People table: commit",
      "People table: update",
      "People table: request",
    ]) {
      if (performance.getEntriesByName(name, "measure").length >= 50)
        performance.clearMeasures(name);
    }
    performance.clearMarks("People table: selection");
    const mark = performance.mark("People table: selection", {
      detail: { pageSize: nextPageSize },
    });
    pending.current = { start: mark.startTime, pageSize: nextPageSize };
  };
}
