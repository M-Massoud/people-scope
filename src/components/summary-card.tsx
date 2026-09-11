import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Skeleton,
} from "@/components/ui";

export function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  detail,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "teal" | "amber";
  detail: string;
}) {
  return (
    <Card className="summary-card" data-tone={tone}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className="summary-icon">
            <Icon aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <strong className="summary-value">{value}</strong>
        <p className="summary-detail">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function SummarySkeleton() {
  return (
    <div className="report-summary" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="summary-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28 max-w-full" />
              <Skeleton className="size-9 shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-2 h-3 w-32 max-w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
