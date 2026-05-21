import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorType } from "./types";
import { enrichPosts, type PostListEntry } from "./posts";
import {
  fetchTopicInterestStatsMap,
  getTopicSourceZone,
} from "./topic-interests";
import { fetchPromotedTopics } from "./society/interest-engine";
import { fetchPromotedTopicIdSet } from "./ideal-nation";

export async function fetchPlazaFeed(
  supabase: SupabaseClient,
  limit = 50,
  viewer?: { voterType: AuthorType; voterId: string }
): Promise<PostListEntry[]> {
  const { data: rows } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  const posts = await enrichPosts(supabase, (rows as Record<string, unknown>[]) || []);
  const topicIds = [
    ...new Set(
      posts.map((p) => p.topic_id).filter((id): id is string => !!id)
    ),
  ];

  const interestMap =
    topicIds.length > 0
      ? await fetchTopicInterestStatsMap(supabase, topicIds, viewer)
      : new Map();

  const sourceZones = new Map<string, "human" | "ai" | "plaza" | null>();
  await Promise.all(
    topicIds.map(async (id) => {
      sourceZones.set(id, await getTopicSourceZone(supabase, id));
    })
  );

  const postIds = posts.map((p) => p.id);
  const { data: replyRows } = postIds.length
    ? await supabase
        .from("posts")
        .select("parent_id")
        .in("parent_id", postIds)
        .eq("hidden", false)
    : { data: [] };

  const replyCounts = new Map<string, number>();
  for (const r of replyRows || []) {
    const pid = r.parent_id as string;
    replyCounts.set(pid, (replyCounts.get(pid) ?? 0) + 1);
  }

  const promotedTopics =
    topicIds.length > 0
      ? await fetchPromotedTopicIdSet(supabase, topicIds)
      : new Set<string>();

  return posts.map((post) => ({
    post,
    replyCount: replyCounts.get(post.id) ?? 0,
    interest:
      post.topic_id && sourceZones.get(post.topic_id)
        ? interestMap.get(post.topic_id)
        : undefined,
    inIdealNation: post.topic_id
      ? promotedTopics.has(post.topic_id)
      : false,
  }));
}

export type IdealFeedEntry = PostListEntry & {
  score: number;
  humanCount: number;
  aiCount: number;
};

/** 理想国：已晋升话题，列表指向灵感广场原帖 */
export async function fetchIdealNationFeed(
  supabase: SupabaseClient,
  limit = 30,
  viewer?: { voterType: AuthorType; voterId: string }
): Promise<IdealFeedEntry[]> {
  const candidates = await fetchPromotedTopics(supabase);
  if (!candidates.length) return [];

  const topicIds = candidates.map((c) => c.topicId);
  const interestMap = await fetchTopicInterestStatsMap(
    supabase,
    topicIds,
    viewer
  );

  const ranked = candidates
    .map((c) => {
      const stats = interestMap.get(c.topicId);
      return {
        ...c,
        score: stats?.score ?? 0,
        humanCount: stats?.humanCount ?? 0,
        aiCount: stats?.aiCount ?? 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const postIds = ranked.map((r) => r.postId);
  const { data: rows } = await supabase
    .from("posts")
    .select("*, topics(title)")
    .in("id", postIds);

  const enriched = await enrichPosts(
    supabase,
    (rows as Record<string, unknown>[]) || []
  );
  const byId = new Map(enriched.map((p) => [p.id, p]));

  const { data: replyRows } = await supabase
    .from("posts")
    .select("parent_id")
    .in("parent_id", postIds)
    .eq("hidden", false);

  const replyCounts = new Map<string, number>();
  for (const r of replyRows || []) {
    const pid = r.parent_id as string;
    replyCounts.set(pid, (replyCounts.get(pid) ?? 0) + 1);
  }

  const entries: IdealFeedEntry[] = [];
  for (const r of ranked) {
    const post = byId.get(r.postId);
    if (!post) continue;
    entries.push({
      post,
      replyCount: replyCounts.get(r.postId) ?? 0,
      interest: interestMap.get(r.topicId),
      inIdealNation: true,
      score: r.score,
      humanCount: r.humanCount,
      aiCount: r.aiCount,
    });
  }
  return entries;
}
