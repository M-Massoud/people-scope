import { PAGES } from "@/config";
import { ReportPage } from "@/modules/reports";
export const metadata = { title: `${PAGES["age-groups"].title} · PeopleScope` };

export default function Page() {
  return <ReportPage kind="age-groups" />;
}
