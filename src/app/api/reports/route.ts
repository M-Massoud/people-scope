import type { NextRequest } from "next/server";
import { getPeopleReport } from "@/modules/reports/server";
import { errorResponse, jsonResponse } from "../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return jsonResponse(await getPeopleReport(request.nextUrl.searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}
