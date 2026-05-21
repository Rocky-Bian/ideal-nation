import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchNotificationsForUser,
  countUnreadNotifications,
} from "@/lib/notifications";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    fetchNotificationsForUser(supabase, user.id),
    countUnreadNotifications(supabase, user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
