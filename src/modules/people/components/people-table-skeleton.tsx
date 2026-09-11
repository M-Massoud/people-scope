import {
  ScrollArea,
  ScrollBar,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

export function PeopleTableSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading people"
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <span className="sr-only">Loading people…</span>
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-3"
      >
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <ScrollArea
        aria-hidden="true"
        inert
        className="h-[420px] min-w-0 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-3"
      >
        <Table scrollable={false} className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              {[
                "Name",
                "Email",
                "Country / city",
                "Gender",
                "Age",
                "Profile date",
              ].map((label) => (
                <TableHead key={label} className="sticky top-0 bg-card">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 7 }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </div>
  );
}
