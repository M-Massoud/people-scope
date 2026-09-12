"use client";
import {
  Alert,
  AlertDescription,
  Button,
  ScrollArea,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/components/ui";
import { usePerson } from "../hooks";
import type { PersonSummary } from "../types";
import { PersonAvatar } from "./person-avatar";

export function PersonDetails({ selected }: { selected: PersonSummary }) {
  const query = usePerson(selected.login.uuid);
  const person = query.data ?? selected;
  return (
    <>
      <SheetHeader>
        <PersonAvatar person={person} large />
        <SheetTitle>{`${person.name.first} ${person.name.last}`}</SheetTitle>
        <SheetDescription>
          Contact information and profile details.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea
        className="min-h-0 flex-1"
        role="region"
        aria-label="Profile details"
      >
        {query.isPending && (
          <div
            className="space-y-4 px-4"
            role="status"
            aria-label="Loading profile details"
          >
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        )}
        {query.isError && (
          <Alert variant="destructive" className="mx-4 w-auto">
            <AlertDescription>
              <p>{query.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Retry profile
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {query.data && (
          <div className="px-4 pb-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries({
                Email: person.email,
                Phone: query.data.phone,
                Country: person.location.country,
                State: query.data.location.state,
                City: person.location.city,
                Nationality: query.data.nat,
                "Provider ID": query.data.id.value?.trim()
                  ? `${query.data.id.name || "ID"} · ${query.data.id.value}`
                  : "Not provided",
                Gender: person.gender,
                Age: person.dob.age,
                "Date of birth": query.data.dob.date.slice(0, 10),
                "Profile date (UTC)": person.registered.date.slice(0, 10),
              }).map(([label, value]) => (
                <div
                  key={label}
                  className={
                    label === "Email" ? "min-w-0 sm:col-span-2" : "min-w-0"
                  }
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
