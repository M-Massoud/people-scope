"use client";

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import type { Range } from "@tanstack/react-virtual";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
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

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 40;
const VIRTUALIZE_ABOVE = 100;

// Spacer rows preserve native table layout and scrollbar height.
function RowSpace({ height }: { height: number }) {
  return height > 0 ? (
    <tr aria-hidden="true" data-virtual-spacer>
      <td colSpan={6} style={{ height, padding: 0, border: 0 }} />
    </tr>
  ) : null;
}

export function OptimizedPeopleTable({
  items,
  busy,
  onSelect,
}: {
  items: Person[];
  busy: boolean;
  onSelect: (person: Person) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const virtualized = items.length > VIRTUALIZE_ABOVE;
  const virtualizer = useVirtualizer({
    enabled: virtualized,
    count: items.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: useCallback(
      (index: number) => items[index].login.uuid,
      [items],
    ),
    overscan: 6,
    scrollMargin: HEADER_HEIGHT,
    scrollPaddingStart: HEADER_HEIGHT,
    // Retain the focused trigger, including while its profile dialog is open.
    rangeExtractor: useCallback(
      (range: Range) => {
        const visible = defaultRangeExtractor(range);
        return focusedIndex !== null && focusedIndex < items.length
          ? [...new Set([...visible, focusedIndex])].sort((a, b) => a - b)
          : visible;
      },
      [focusedIndex, items.length],
    ),
  });

  useLayoutEffect(() => {
    pendingFocus.current = null;
    setFocusedIndex(null);
    if (viewport.current) viewport.current.scrollTop = 0;
    if (virtualized) virtualizer.scrollToOffset(0);
  }, [items, virtualized, virtualizer]);

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const button = table.current?.querySelector<HTMLButtonElement>(
      `[data-person-index="${pendingFocus.current}"] button`,
    );
    if (button) {
      pendingFocus.current = null;
      button.focus({ preventScroll: true });
    }
  });

  function moveFocus(event: KeyboardEvent, index: number) {
    if (!virtualized || event.altKey || event.ctrlKey || event.metaKey) return;
    let target: number;
    switch (event.key) {
      case "ArrowDown":
        target = index + 1;
        break;
      case "ArrowUp":
        target = index - 1;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = items.length - 1;
        break;
      case "Tab":
        target = index + (event.shiftKey ? -1 : 1);
        break;
      default:
        return;
    }
    // At the boundaries, Tab exits the table normally.
    if (target < 0 || target >= items.length) return;
    event.preventDefault();
    pendingFocus.current = target;
    setFocusedIndex(target);
    virtualizer.scrollToIndex(target, { align: "auto" });
  }

  const rows = virtualized
    ? virtualizer.getVirtualItems()
    : items.map((person, index) => ({
        index,
        key: person.login.uuid,
        start: index * ROW_HEIGHT,
        end: (index + 1) * ROW_HEIGHT,
      }));
  const bottomSpace =
    virtualized && rows.length
      ? virtualizer.getTotalSize() - (rows.at(-1)!.end - HEADER_HEIGHT)
      : 0;

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
        ref={table}
        data-testid="people-table"
        scrollable={false}
        aria-rowcount={items.length + 1}
        className={virtualized ? "min-w-[1000px] table-fixed" : "min-w-[900px]"}
      >
        {virtualized && (
          <colgroup>
            {[24, 27, 21, 8, 6, 14].map((width, index) => (
              <col key={index} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
        )}
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
          {rows.map((row, position) => {
            const person = items[row.index];
            const name = `${person.name.first} ${person.name.last}`;
            const gap = virtualized
              ? row.start - (position ? rows[position - 1].end : HEADER_HEIGHT)
              : 0;
            return (
              <Fragment key={row.key}>
                <RowSpace height={gap} />
                <TableRow
                  data-person-row
                  data-person-index={row.index}
                  data-person-id={person.login.uuid}
                  aria-rowindex={row.index + 2}
                  style={virtualized ? { height: ROW_HEIGHT } : undefined}
                >
                  <TableCell>
                    <SheetTrigger
                      render={
                        <Button
                          variant="link"
                          className={
                            virtualized
                              ? "h-auto max-w-full justify-start p-0 text-left"
                              : "h-auto justify-start p-0 text-left"
                          }
                        />
                      }
                      onClick={() => onSelect(person)}
                      onFocus={() => {
                        if (virtualized) setFocusedIndex(row.index);
                      }}
                      onKeyDown={(event) => moveFocus(event, row.index)}
                      title={virtualized ? name : undefined}
                    >
                      <PersonAvatar person={person} />
                      <span className={virtualized ? "truncate" : undefined}>
                        {name}
                      </span>
                    </SheetTrigger>
                  </TableCell>
                  <TableCell
                    className={virtualized ? "truncate" : undefined}
                    title={person.email}
                  >
                    {person.email}
                  </TableCell>
                  <TableCell>
                    <div
                      className={virtualized ? "truncate" : undefined}
                      title={person.location.country}
                    >
                      {person.location.country}
                    </div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={person.location.city}
                    >
                      {person.location.city}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{person.gender}</TableCell>
                  <TableCell>{person.dob.age}</TableCell>
                  <TableCell>{person.registered.date.slice(0, 10)}</TableCell>
                </TableRow>
              </Fragment>
            );
          })}
          <RowSpace height={bottomSpace} />
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
