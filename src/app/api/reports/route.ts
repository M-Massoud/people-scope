import { NextRequest, NextResponse } from "next/server";
import { InvalidFiltersError } from "@/modules/people/server";
import { getPeopleReport } from "@/modules/reports/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await getPeopleReport(request.nextUrl.searchParams),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof InvalidFiltersError)
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      {
        error:
          "Random User profiles could not be loaded. Please try again shortly.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
