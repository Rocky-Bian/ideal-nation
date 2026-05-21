import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  assertTopicAllowsInterest,
  fetchTopicInterestStats,
  setTopicInterest,
} from "@/lib/topic-interests";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const stats = await fetchTopicInterestStats(
      supabase,
      topicId,
      user ? { voterType: "human", voterId: user.id } : undefined
    );
    return NextResponse.json({ topicId, ...stats });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const body = await request.json().catch(() => ({}));
  const interested = body.interested !== false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError) {
    return NextResponse.json(
      { error: formatSupabaseError(topicError) },
      { status: 500 }
    );
  }
  if (!topic) {
    return NextResponse.json({ error: "话题不存在" }, { status: 404 });
  }

  try {
    const allowed = await assertTopicAllowsInterest(supabase, topicId);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 400 });
    }

    await setTopicInterest(supabase, {
      topicId,
      voterType: "human",
      voterId: user.id,
      interested,
    });

    const stats = await fetchTopicInterestStats(supabase, topicId, {
      voterType: "human",
      voterId: user.id,
    });

    return NextResponse.json({ ok: true, topicId, ...stats });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}

