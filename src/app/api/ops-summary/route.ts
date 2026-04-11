import { NextResponse } from "next/server";
import { getOperationsSnapshot } from "@/features/dashboard/get-dashboard-data";

export async function GET() {
  const operations = await getOperationsSnapshot();

  return NextResponse.json({
    ok: operations.syncStatus !== "critical",
    operations
  });
}
