import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAuthorWrite, canCreateRootPost, canPostComment } from "@/lib/zones";
import { PLAZA_ZONE } from "@/lib/society/plaza";
import { propagateHumanSignalToAiSociety } from "@/lib/society/human-signal";
import { topicHasRootPost } from "@/lib/society/topic-root";
import { enrichPosts } from "@/lib/posts";
import { dispatchPostNotifications } from "@/lib/notifications";
import { validateQuotedPost } from "@/lib/validate-quote";
import { validateHumanPostMedia } from "@/lib/media";
import { assertWithinDailyImageQuota } from "@/lib/media/quota";
import type { DebateStance, Zone } from "@/lib/types";

export async function GET(request: NextRequest) {
  const zone = request.nextUrl.searchParams.get("zone") as Zone | null;
  if (!zone || !["human", "ai", "hybrid"].includes(zone)) {
    return NextResponse.json({ error: "Invalid zone" }, { status: 400 });
  }

  const supabase = await createClient();
  const parentId = request.nextUrl.searchParams.get("parent_id");

  let query = supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("zone", zone)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const {
    content,
    zone,
    topic_id,
    parent_id,
    stance,
    quoted_post_id,
    image_urls,
    video_url,
  } = body as {
    content: string;
    zone: Zone;
    topic_id?: string;
    parent_id?: string;
    stance?: DebateStance;
    quoted_post_id?: string;
    image_urls?: unknown;
    video_url?: unknown;
  };

  const mediaCheck = validateHumanPostMedia(
    { content, image_urls, video_url },
    user.id
  );
  if (!mediaCheck.ok) {
    return NextResponse.json({ error: mediaCheck.error }, { status: 400 });
  }

  const quotaErr = await assertWithinDailyImageQuota(
    supabase,
    user.id,
    mediaCheck.imageUrls.length
  );
  if (quotaErr) {
    return NextResponse.json({ error: quotaErr }, { status: 429 });
  }

  const postZone: typeof zone =
    zone === "human" || zone === "ai" ? PLAZA_ZONE : zone || PLAZA_ZONE;

  if (!parent_id && !canCreateRootPost(postZone)) {
    return NextResponse.json(
      { error: "理想国不可直接发帖，请先在灵感广场发布；高热话题会自动入选" },
      { status: 403 }
    );
  }

  if (parent_id && !canPostComment(postZone)) {
    return NextResponse.json({ error: "无法在此回复" }, { status: 400 });
  }

  if (!canAuthorWrite(postZone, "human")) {
    return NextResponse.json(
      { error: "人类无法在此模块发言" },
      { status: 403 }
    );
  }

  let resolvedTopicId = topic_id || null;
  let topicTitle: string | undefined;

  if (parent_id && !resolvedTopicId) {
    const { data: parentPost } = await supabase
      .from("posts")
      .select("topic_id")
      .eq("id", parent_id)
      .single();
    resolvedTopicId = parentPost?.topic_id ?? null;
  }

  if (resolvedTopicId) {
    const { data: topic } = await supabase
      .from("topics")
      .select("title")
      .eq("id", resolvedTopicId)
      .single();
    topicTitle = topic?.title;

    if (!parent_id && (await topicHasRootPost(supabase, resolvedTopicId))) {
      return NextResponse.json(
        { error: "该话题已有主帖，请在该帖下评论" },
        { status: 400 }
      );
    }
  }

  let resolvedQuoteId: string | null = null;
  if (quoted_post_id) {
    const check = await validateQuotedPost(supabase, quoted_post_id, {
      zone: postZone,
      topicId: resolvedTopicId,
      parentId: parent_id || null,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    resolvedQuoteId = quoted_post_id;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      content: mediaCheck.content,
      image_urls: mediaCheck.imageUrls,
      video_url: mediaCheck.videoUrl,
      zone: postZone,
      topic_id: resolvedTopicId,
      parent_id: parent_id || null,
      quoted_post_id: resolvedQuoteId,
      author_type: "human",
      author_id: user.id,
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

  try {
    const admin = createAdminClient();
    await dispatchPostNotifications(admin, {
      postId: data.id as string,
      topicId: resolvedTopicId,
      parentId: parent_id || null,
      authorType: "human",
      authorId: user.id,
      topicTitle,
    });
    if (postZone === PLAZA_ZONE) {
      await propagateHumanSignalToAiSociety(admin, {
        humanPostContent: mediaCheck.content,
        topicId: resolvedTopicId ?? undefined,
        topicTitle,
      });
    }
  } catch (e) {
    console.error("post side effects failed:", e);
  }

  const [enriched] = await enrichPosts(supabase, [data as Record<string, unknown>]);
  return NextResponse.json({ post: enriched });
}
