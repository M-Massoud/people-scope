import type { NextRequest } from "next/server";
import { getPeoplePage } from "@/modules/people/server";
import { errorResponse, jsonResponse } from "../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return jsonResponse(await getPeoplePage(request.nextUrl.searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}
