import type { NextRequest } from "next/server";
import { getPerson } from "@/modules/people/server";
import { errorResponse, jsonResponse } from "../../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const person = await getPerson(id);
    if (!person)
      return jsonResponse(
        {
          error:
            "This profile is no longer available. Refresh the table and choose another person.",
        },
        404,
      );
    return jsonResponse(person);
  } catch (error) {
    return errorResponse(
      error,
      "Profile details could not be loaded. Please try again shortly.",
    );
  }
}
