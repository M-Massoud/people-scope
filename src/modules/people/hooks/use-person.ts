"use client";
import { useQuery } from "@tanstack/react-query";
import { readJson } from "@/lib";
import type { Person } from "../types";

export function usePerson(id: string) {
  return useQuery({
    queryKey: ["person", id],
    queryFn: ({ signal }) =>
      readJson<Person>(`/api/people/${encodeURIComponent(id)}`, signal),
  });
}
