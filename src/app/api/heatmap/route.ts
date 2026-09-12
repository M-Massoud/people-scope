import type { NextRequest } from "next/server";
import { getHeatmap } from "@/modules/heatmap/server";
import { errorResponse, jsonResponse } from "../_lib/responses";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return jsonResponse(await getHeatmap(request.nextUrl.searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}
