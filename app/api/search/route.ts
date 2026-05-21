import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ topics: [], posts: [] });
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [topics, posts] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, status, origin, created_at")
      .ilike("title", pattern)
      .limit(15),
    supabase
      .from("posts")
      .select("id, content, zone, created_at, topic_id")
      .eq("hidden", false)
      .ilike("content", pattern)
      .limit(20),
  ]);

  return NextResponse.json({
    topics: topics.data || [],
    posts: posts.data || [],
  });
}
