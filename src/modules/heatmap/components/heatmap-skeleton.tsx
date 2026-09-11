import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";
export function HeatmapSkeleton({
  view = "world",
}: {
  view?: "world" | "age";
}) {
  return (
    <div
      role="status"
      aria-label="Loading heatmap"
      data-testid="heatmap-skeleton"
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-3 gap-4 py-6">
        {[0, 1, 2].map((value) => (
          <div key={value} className="flex flex-col gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div
        className={
          view === "world"
            ? "grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)]"
            : ""
        }
      >
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton
              className={
                view === "world"
                  ? "h-[320px] w-full sm:h-[520px]"
                  : "h-[744px] w-full"
              }
            />
          </CardContent>
        </Card>
        {view === "world" && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent className="flex h-[520px] flex-col gap-4">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
