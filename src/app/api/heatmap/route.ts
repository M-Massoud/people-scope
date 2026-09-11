import { NextRequest, NextResponse } from "next/server";
import { getHeatmap } from "@/modules/heatmap/server";
import { InvalidFiltersError } from "@/modules/people/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getHeatmap(request.nextUrl.searchParams), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InvalidFiltersError
            ? error.message
            : "Random User profiles could not be loaded. Please try again shortly.",
      },
      {
        status: error instanceof InvalidFiltersError ? 400 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
