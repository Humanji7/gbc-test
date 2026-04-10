import { NextResponse } from "next/server";
import { APP_NAME, CURRENT_MILESTONE } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: APP_NAME,
    milestone: CURRENT_MILESTONE
  });
}
