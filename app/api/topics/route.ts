import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("topics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.in("status", ["emerging", "active", "fading"]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topics: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { title, origin } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const allowedOrigin = origin === "hybrid" ? "hybrid" : "human";

  const { data, error } = await supabase
    .from("topics")
    .insert({
      title: title.trim(),
      origin: allowedOrigin,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}
