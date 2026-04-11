import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: APP_NAME
  });
}
