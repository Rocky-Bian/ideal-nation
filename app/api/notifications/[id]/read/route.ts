import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const updated = await markNotificationRead(supabase, user.id, id);
  return NextResponse.json({ ok: true, updated });
}
