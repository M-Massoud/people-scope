import { PAGES } from "@/config";
import { HeatmapPage } from "@/modules/heatmap";
export const metadata = { title: `${PAGES["heatmap"].title} · PeopleScope` };

export default function Page() {
  return <HeatmapPage />;
}
