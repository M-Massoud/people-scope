import type { NextRequest } from "next/server";
import { getCountryComparison } from "@/modules/comparison/server";
import { errorResponse, jsonResponse } from "../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return jsonResponse(
      await getCountryComparison(request.nextUrl.searchParams),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
