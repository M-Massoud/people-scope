import { NextResponse, type NextRequest } from "next/server";
import { getPerson, InvalidFiltersError } from "@/modules/people/server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const person = await getPerson(id);
    if (!person)
      return NextResponse.json(
        {
          error:
            "This profile is no longer available. Refresh the table and choose another person.",
        },
        { status: 404, headers },
      );
    return NextResponse.json(person, { headers });
  } catch (error) {
    if (error instanceof InvalidFiltersError)
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers },
      );
    return NextResponse.json(
      {
        error: "Profile details could not be loaded. Please try again shortly.",
      },
      { status: 502, headers },
    );
  }
}
