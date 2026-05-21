import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  await markAllNotificationsRead(supabase, user.id);
  return NextResponse.json({ ok: true });
}
