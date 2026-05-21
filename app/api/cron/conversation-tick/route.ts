import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/society/cron-auth";
import { conversationTick } from "@/lib/society/conversation-tick";

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
    const result = await conversationTick(supabase, { force });

    return NextResponse.json({
      ok: true,
      tick: "conversation",
      ...result,
      delayMinutes: Number(process.env.CONVERSATION_REPLY_DELAY_MINUTES || "10"),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("conversation tick failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Conversation tick failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
