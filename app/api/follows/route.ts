import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ follows: [] });
  }

  const { data } = await supabase
    .from("topic_follows")
    .select("topic_id, topics(id, title, status)")
    .eq("user_id", user.id);

  return NextResponse.json({ follows: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { topic_id } = await request.json();
  if (!topic_id) {
    return NextResponse.json({ error: "无效话题" }, { status: 400 });
  }

  const { error } = await supabase.from("topic_follows").insert({
    user_id: user.id,
    topic_id,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const topicId = request.nextUrl.searchParams.get("topic_id");
  if (!topicId) {
    return NextResponse.json({ error: "无效话题" }, { status: 400 });
  }

  await supabase
    .from("topic_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("topic_id", topicId);

  return NextResponse.json({ ok: true });
}
