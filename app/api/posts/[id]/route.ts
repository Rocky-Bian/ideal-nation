import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("author_id, author_type")
    .eq("id", id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "不存在" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner =
    post.author_type === "human" && post.author_id === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const client = isAdmin ? createAdminClient() : supabase;
  const { error } = await client
    .from("posts")
    .update({ hidden: true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
