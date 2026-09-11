"use client";

import { useLayoutEffect, useRef } from "react";
import {
  Button,
  ScrollArea,
  ScrollBar,
  SheetTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { Person } from "../types";
import { PersonAvatar } from "./person-avatar";

// Original rendering approach: every requested record has a real table row.
// Kept deliberately straightforward for comparison with OptimizedPeopleTable.
export function PeopleTable({
  items,
  busy,
  onSelect,
}: {
  items: Person[];
  busy: boolean;
  onSelect: (person: Person) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [items]);

  return (
    <ScrollArea
      viewportRef={viewport}
      data-testid="people-scroll-area"
      aria-busy={busy}
      role="region"
      aria-label="Scrollable people table"
      className="isolate h-[420px] min-w-0 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-3"
    >
      <Table
        data-testid="people-table"
        scrollable={false}
        className="min-w-[900px]"
        aria-rowcount={items.length + 1}
      >
        <TableHeader>
          <TableRow aria-rowindex={1}>
            {[
              "Name",
              "Email",
              "Country / city",
              "Gender",
              "Age",
              "Profile date",
            ].map((label) => (
              <TableHead
                key={label}
                scope="col"
                className="sticky top-0 z-10 bg-card"
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((person, index) => (
            <TableRow
              key={person.login.uuid}
              data-person-row
              data-person-index={index}
              data-person-id={person.login.uuid}
              aria-rowindex={index + 2}
            >
              <TableCell>
                <SheetTrigger
                  render={
                    <Button
                      variant="link"
                      className="h-auto justify-start p-0 text-left"
                    />
                  }
                  onClick={() => onSelect(person)}
                >
                  <PersonAvatar person={person} />
                  <span>
                    {person.name.first} {person.name.last}
                  </span>
                </SheetTrigger>
              </TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>
                <div>{person.location.country}</div>
                <div className="text-xs text-muted-foreground">
                  {person.location.city}
                </div>
              </TableCell>
              <TableCell className="capitalize">{person.gender}</TableCell>
              <TableCell>{person.dob.age}</TableCell>
              <TableCell>{person.registered.date.slice(0, 10)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
