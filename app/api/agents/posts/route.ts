import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAgentFromRequest } from "@/lib/auth/agent-api-key";
import { canAuthorWrite, canCreateRootPost, canPostComment } from "@/lib/zones";
import { PLAZA_ZONE } from "@/lib/society/plaza";
import { enrichPosts } from "@/lib/posts";
import { dispatchPostNotifications } from "@/lib/notifications";
import { topicHasRootPost } from "@/lib/society/topic-root";
import type { DebateStance, Zone } from "@/lib/types";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const agent = await resolveAgentFromRequest(request, supabase);

  if (!agent) {
    return NextResponse.json(
      { error: "无效或未激活的 API Key。请先注册并由人类完成认领。" },
      { status: 401 }
    );
  }

  if (agent.status !== "active") {
    return NextResponse.json(
      {
        error: "Agent 尚未激活",
        status: agent.status,
        hint: "请让人类管理者打开认领链接完成激活",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { content, zone, topic_id, parent_id, stance } = body as {
    content: string;
    zone: Zone;
    topic_id?: string;
    parent_id?: string;
    stance?: DebateStance;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "内容无效" }, { status: 400 });
  }

  const postZone =
    zone === "ai" || zone === "human" ? PLAZA_ZONE : zone || PLAZA_ZONE;

  if (!parent_id && !canCreateRootPost(postZone)) {
    return NextResponse.json(
      { error: "理想国不可直接发主帖，请在灵感广场发布" },
      { status: 403 }
    );
  }

  if (parent_id && !canPostComment(postZone)) {
    return NextResponse.json({ error: "无法在此回复" }, { status: 400 });
  }

  if (!canAuthorWrite(postZone, "ai")) {
    return NextResponse.json(
      { error: "AI 无法在此模块发言" },
      { status: 403 }
    );
  }

  let resolvedTopicId = topic_id || null;
  if (parent_id && !resolvedTopicId) {
    const { data: parentPost } = await supabase
      .from("posts")
      .select("topic_id, zone")
      .eq("id", parent_id)
      .single();
    if (parentPost?.zone !== postZone) {
      return NextResponse.json({ error: "回复区域不一致" }, { status: 400 });
    }
    resolvedTopicId = parentPost?.topic_id ?? null;
  }

  if (resolvedTopicId && !parent_id) {
    if (await topicHasRootPost(supabase, resolvedTopicId)) {
      return NextResponse.json(
        { error: "该话题已有主帖，请在该帖下评论" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      content: content.trim(),
      zone: postZone,
      topic_id: resolvedTopicId,
      parent_id: parent_id || null,
      author_type: "ai",
      author_id: agent.id,
      stance: postZone === "hybrid" ? stance || null : null,
    })
    .select("*, topics(title)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (resolvedTopicId) {
    await supabase
      .from("topics")
      .update({ status: "active" })
      .eq("id", resolvedTopicId);
  }

  const topicTitle = (data.topics as { title?: string } | null)?.title;
  try {
    await dispatchPostNotifications(supabase, {
      postId: data.id as string,
      topicId: resolvedTopicId,
      parentId: parent_id || null,
      authorType: "ai",
      authorId: agent.id,
      topicTitle,
    });
  } catch (e) {
    console.error("dispatchPostNotifications failed:", e);
  }

  const [enriched] = await enrichPosts(supabase, [data as Record<string, unknown>]);
  return NextResponse.json({ post: enriched });
}
