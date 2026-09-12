"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PAGES, type PageId } from "@/config";
import { Shell } from "./shell";
import { SummarySkeleton } from "./summary-card";
import { Card, CardContent, CardHeader, Skeleton } from "./ui";

export function PageLoading({ page }: { page: PageId }) {
  return (
    <Suspense fallback={<LoadingShell page={page} />}>
      <LoadingWithQuery page={page} />
    </Suspense>
  );
}

function LoadingWithQuery({ page }: { page: PageId }) {
  const params = useSearchParams();
  return <LoadingShell page={page} queryString={params.toString()} />;
}

function LoadingShell({
  page,
  queryString,
}: {
  page: PageId;
  queryString?: string;
}) {
  return (
    <Shell active={page} queryString={queryString}>
      <div className="report-page [&_.summary-card]:animate-none">
        <div className="page-heading animate-none">
          <h1>{PAGES[page].title}</h1>
        </div>
        <div role="status" aria-label="Loading page" aria-busy="true">
          <span className="sr-only">Loading {PAGES[page].title}…</span>
          <SummarySkeleton />
          <div className="report-grid" aria-hidden="true">
            {[0, 1].map((panel) => (
              <Card key={panel}>
                <CardHeader>
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                </CardHeader>
                <CardContent className="min-h-0 flex-1">
                  <Skeleton className="h-full w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
