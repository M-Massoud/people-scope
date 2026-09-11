import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
export function ReportSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading report"
      data-testid="report-skeleton"
      aria-busy="true"
    >
      <span className="sr-only">Loading report…</span>
      <div className="filter-panel" aria-hidden="true">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      <div className="report-summary" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className={i === 0 ? "h-9 w-24" : "h-6 w-44"} />
          </div>
        ))}
      </div>
      <div className="report-grid items-stretch" aria-hidden="true">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-44" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
