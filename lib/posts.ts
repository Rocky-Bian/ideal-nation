import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorType, PostWithAuthor, ReplyNode, Zone } from "./types";
import { sanitizePostBody, sanitizeTopicTitle } from "./ai/sanitize";
import { excerptQuote } from "./quote";
import {
  fetchTopicInterestStatsMap,
  type TopicInterestStats,
} from "./topic-interests";

export async function enrichPosts(
  supabase: SupabaseClient,
  posts: Record<string, unknown>[]
): Promise<PostWithAuthor[]> {
  if (!posts.length) return [];

  const humanIds = posts
    .filter((p) => p.author_type === "human")
    .map((p) => p.author_id as string);
  const aiIds = posts
    .filter((p) => p.author_type === "ai")
    .map((p) => p.author_id as string);
  const postIds = posts.map((p) => p.id as string);
  const quoteIds = [
    ...new Set(
      posts
        .map((p) => p.quoted_post_id as string | null)
        .filter((id): id is string => !!id)
    ),
  ];

  const [{ data: users }, { data: agents }, { data: quotedRows }] =
    await Promise.all([
      humanIds.length
        ? supabase
            .from("users")
            .select("id, email, display_name, member_number")
            .in("id", humanIds)
        : Promise.resolve({ data: [] }),
      aiIds.length
        ? supabase
            .from("ai_agents")
            .select("id, name, member_number")
            .in("id", aiIds)
        : Promise.resolve({ data: [] }),
      quoteIds.length
        ? supabase
            .from("posts")
            .select("id, content, author_type, author_id")
            .in("id", quoteIds)
            .eq("hidden", false)
        : Promise.resolve({ data: [] }),
    ]);

  const userMap = new Map(
    (users || []).map((u) => [
      u.id,
      {
        name: u.display_name || u.email.split("@")[0],
        member_number: u.member_number,
      },
    ])
  );
  const agentMap = new Map(
    (agents || []).map((a) => [
      a.id,
      { name: a.name, member_number: a.member_number },
    ])
  );

  const quoteHumanIds = (quotedRows || [])
    .filter((q) => q.author_type === "human")
    .map((q) => q.author_id as string);
  const quoteAiIds = (quotedRows || [])
    .filter((q) => q.author_type === "ai")
    .map((q) => q.author_id as string);

  const [{ data: quoteUsers }, { data: quoteAgents }] = await Promise.all([
    quoteHumanIds.length
      ? supabase
          .from("users")
          .select("id, email, display_name")
          .in("id", quoteHumanIds)
      : Promise.resolve({ data: [] }),
    quoteAiIds.length
      ? supabase.from("ai_agents").select("id, name").in("id", quoteAiIds)
      : Promise.resolve({ data: [] }),
  ]);

  const quoteAuthorName = (authorType: string, authorId: string) => {
    if (authorType === "human") {
      const u = (quoteUsers || []).find((x) => x.id === authorId);
      return u?.display_name || u?.email?.split("@")[0] || "人类成员";
    }
    const a = (quoteAgents || []).find((x) => x.id === authorId);
    return a?.name || "AI 成员";
  };

  const quoteMap = new Map(
    (quotedRows || []).map((q) => [
      q.id as string,
      {
        id: q.id as string,
        author_name: quoteAuthorName(q.author_type as string, q.author_id as string),
        author_type: q.author_type as AuthorType,
        content: q.content as string,
        excerpt: excerptQuote(q.content as string),
      },
    ])
  );

  return posts.map((p) => {
    const author =
      p.author_type === "human"
        ? userMap.get(p.author_id as string)
        : agentMap.get(p.author_id as string);

    const quotedId = p.quoted_post_id as string | null;
    const rawTopicTitle = (p.topics as { title?: string } | null)?.title;
    const topic_title = rawTopicTitle
      ? sanitizeTopicTitle(rawTopicTitle)
      : undefined;
    const content = sanitizePostBody(
      p.content as string,
      topic_title
    );

    const image_urls = Array.isArray(p.image_urls)
      ? (p.image_urls as string[])
      : [];
    const video_url =
      typeof p.video_url === "string" ? (p.video_url as string) : null;

    return {
      ...(p as unknown as PostWithAuthor),
      content,
      image_urls,
      video_url,
      author_name: author?.name || (p.author_type === "ai" ? "AI 成员" : "人类成员"),
      author_member_number: author?.member_number ?? null,
      topic_title,
      quote: quotedId ? quoteMap.get(quotedId) ?? null : null,
    };
  });
}

export async function fetchPostsByZone(
  supabase: SupabaseClient,
  zone: Zone,
  limit = 50
): Promise<PostWithAuthor[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("zone", zone)
    .eq("hidden", false)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];
  return enrichPosts(supabase, posts);
}

export type PostListEntry = {
  post: PostWithAuthor;
  replyCount: number;
  interest?: TopicInterestStats;
  /** 话题已晋升理想国精选 */
  inIdealNation?: boolean;
};

export async function fetchPostListByZone(
  supabase: SupabaseClient,
  zone: Zone,
  limit = 50,
  viewer?: { voterType: AuthorType; voterId: string }
): Promise<PostListEntry[]> {
  const posts = await fetchPostsByZone(supabase, zone, limit);
  const counts = await fetchReplyCountsForRoots(
    supabase,
    zone,
    posts.map((p) => p.id)
  );

  const topicIds = [
    ...new Set(
      posts.map((p) => p.topic_id).filter((id): id is string => !!id)
    ),
  ];
  const interestMap =
    zone !== "hybrid" && topicIds.length
      ? await fetchTopicInterestStatsMap(supabase, topicIds, viewer)
      : new Map<string, TopicInterestStats>();

  return posts.map((post) => ({
    post,
    replyCount: counts.get(post.id) ?? 0,
    interest: post.topic_id ? interestMap.get(post.topic_id) : undefined,
  }));
}

/** 话题的唯一主帖（每个话题仅一条 parent_id 为空的帖子） */
export async function fetchTopicRootPost(
  supabase: SupabaseClient,
  topicId: string
): Promise<PostWithAuthor | null> {
  const { data: post } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("topic_id", topicId)
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!post) return null;
  const [enriched] = await enrichPosts(supabase, [post as Record<string, unknown>]);
  return enriched ?? null;
}

export async function fetchPostsByTopic(
  supabase: SupabaseClient,
  topicId: string,
  limit = 80
): Promise<PostWithAuthor[]> {
  const { data: posts } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("topic_id", topicId)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts) return [];
  return enrichPosts(supabase, posts);
}

export async function fetchReplies(
  supabase: SupabaseClient,
  parentId: string
): Promise<PostWithAuthor[]> {
  const { data: posts } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("parent_id", parentId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });

  if (!posts) return [];
  return enrichPosts(supabase, posts);
}

export function excerptContent(
  content: string,
  maxLen = 100,
  topicTitle?: string | null
): string {
  const flat = sanitizePostBody(content, topicTitle).replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen)}…`;
}

export async function fetchPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<PostWithAuthor | null> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .eq("id", postId)
    .eq("hidden", false)
    .single();

  if (error || !post) return null;
  const [enriched] = await enrichPosts(supabase, [post as Record<string, unknown>]);
  return enriched ?? null;
}

/** 批量统计主帖下的回复总数（含嵌套） */
export async function fetchReplyCountsForRoots(
  supabase: SupabaseClient,
  zone: Zone,
  rootIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!rootIds.length) return counts;

  const rootSet = new Set(rootIds);
  for (const id of rootIds) counts.set(id, 0);

  const { data: descendants } = await supabase
    .from("posts")
    .select("id, parent_id")
    .eq("zone", zone)
    .eq("hidden", false)
    .not("parent_id", "is", null);

  if (!descendants?.length) return counts;

  const parentOf = new Map<string, string>();
  for (const row of descendants) {
    if (row.parent_id) parentOf.set(row.id as string, row.parent_id as string);
  }

  function resolveRoot(postId: string): string | null {
    const seen = new Set<string>();
    let current: string | null = postId;
    while (current && !seen.has(current)) {
      seen.add(current);
      if (rootSet.has(current)) return current;
      current = parentOf.get(current) ?? null;
    }
    return null;
  }

  for (const row of descendants) {
    const root = resolveRoot(row.id as string);
    if (root) counts.set(root, (counts.get(root) ?? 0) + 1);
  }

  return counts;
}

export async function fetchReplyTree(
  supabase: SupabaseClient,
  parentId: string,
  maxDepth = 8
): Promise<ReplyNode[]> {
  const posts = await fetchReplies(supabase, parentId);
  if (!posts.length || maxDepth <= 0) {
    return posts.map((post) => ({ post, children: [] }));
  }

  return Promise.all(
    posts.map(async (post) => ({
      post,
      children: await fetchReplyTree(supabase, post.id, maxDepth - 1),
    }))
  );
}
