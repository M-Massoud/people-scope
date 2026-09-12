import { NextResponse } from "next/server";
import { InvalidFiltersError } from "@/modules/people/server";

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(
  error: unknown,
  fallbackMessage = "Random User profiles could not be loaded. Please try again shortly.",
): NextResponse {
  if (error instanceof InvalidFiltersError)
    return jsonResponse({ error: error.message }, 400);
  return jsonResponse({ error: fallbackMessage }, 502);
}
