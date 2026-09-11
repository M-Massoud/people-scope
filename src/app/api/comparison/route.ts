import { NextRequest, NextResponse } from "next/server";
import {
  getCountryComparison,
  InvalidFiltersError,
} from "@/server/people-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await getCountryComparison(request.nextUrl.searchParams),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const invalid = error instanceof InvalidFiltersError;
    return NextResponse.json(
      {
        error: invalid
          ? error.message
          : "Random User profiles could not be loaded. Please try again shortly.",
      },
      { status: invalid ? 400 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
