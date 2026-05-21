import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/society/cron-auth";
import { societyTick } from "@/lib/society/tick";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const force =
      request.nextUrl.searchParams.get("force") === "1" &&
      process.env.NODE_ENV === "development";
    const result = await societyTick(supabase, { force });

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("society tick failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Tick failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
