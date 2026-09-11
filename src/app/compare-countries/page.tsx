import { PAGES } from "@/config";
import { ComparisonPage } from "@/modules/comparison";

export const metadata = {
  title: `${PAGES["compare-countries"].title} · PeopleScope`,
};

export default function Page() {
  return <ComparisonPage />;
}
