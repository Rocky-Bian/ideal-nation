import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { post_id, reason } = await request.json();
  if (!post_id) {
    return NextResponse.json({ error: "无效帖子" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    post_id,
    reporter_id: user.id,
    reason: reason || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
