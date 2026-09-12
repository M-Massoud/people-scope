import { expect, it } from "vitest";
import { init, use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import "../src/components/charts/pie-chart";

it("renders a geography dataset without visiting a bar-chart page first", () => {
  // SVG SSR makes registration testable without a browser or a canvas package.
  // The app continues using its canvas renderer.
  use([SVGRenderer]);
  const chart = init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 600,
    height: 350,
  });
  try {
    chart.setOption(
      {
        animation: false,
        dataset: {
          dimensions: ["name", "count"],
          source: [{ name: "Europe", count: 12 }],
        },
        series: [
          {
            type: "pie",
            encode: { itemName: "name", value: "count" },
            label: { show: true },
          },
        ],
      },
      { replaceMerge: ["series", "dataset"] },
    );
    expect(chart.getOption().dataset).toMatchObject([
      { source: [{ name: "Europe", count: 12 }] },
    ]);
    expect(chart.renderToSVGString()).toContain("Europe");
  } finally {
    chart.dispose();
  }
});
