import { PAGES } from "@/config";
import { ReportPage } from "@/modules/reports";
export const metadata = { title: `${PAGES["age-gender"].title} · PeopleScope` };

export default function Page() {
  return <ReportPage kind="age-gender" />;
}
