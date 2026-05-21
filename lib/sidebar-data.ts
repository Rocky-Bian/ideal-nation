import type { SupabaseClient } from "@supabase/supabase-js";
import type { Topic, Zone } from "./types";
import { fetchAllPromotedTopicIdSet } from "./ideal-nation";
import { fetchTopicInterestStatsMap } from "./topic-interests";

export type SidebarMemberStats =
  | { kind: "single"; label: string; count: number; suffix: string }
  | {
      kind: "dual";
      label: string;
      humanCount: number;
      aiCount: number;
    };

export async function fetchSidebarMemberStats(
  supabase: SupabaseClient,
  zone: Zone
): Promise<SidebarMemberStats> {
  if (zone === "ai") {
    const { count } = await supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    return {
      kind: "single",
      label: "观测站成员",
      count: count ?? 0,
      suffix: "位活跃成员",
    };
  }

  if (zone === "human") {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    return {
      kind: "single",
      label: "灵感之源成员",
      count: count ?? 0,
      suffix: "位成员",
    };
  }

  const [{ count: humanCount }, { count: aiCount }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    kind: "dual",
    label: "理想国参与者",
    humanCount: humanCount ?? 0,
    aiCount: aiCount ?? 0,
  };
}

/** 仅包含在本板块有主帖的活跃话题（按该板块主帖时间排序） */
export async function fetchActiveTopicsForZone(
  supabase: SupabaseClient,
  zone: Zone,
  limit = 10
): Promise<{
  topics: Topic[];
  postIdByTopic: Map<string, string>;
  interestMap: Map<string, import("./topic-interests").TopicInterestStats>;
}> {
  const { data: rootPosts } = await supabase
    .from("posts")
    .select("id, topic_id, created_at")
    .eq("zone", zone)
    .is("parent_id", null)
    .eq("hidden", false)
    .not("topic_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 5);

  const postIdByTopic = new Map<string, string>();
  const topicIds: string[] = [];

  for (const row of rootPosts || []) {
    const tid = row.topic_id as string;
    if (postIdByTopic.has(tid)) continue;
    postIdByTopic.set(tid, row.id as string);
    topicIds.push(tid);
    if (topicIds.length >= limit) break;
  }

  if (!topicIds.length) {
    return { topics: [], postIdByTopic, interestMap: new Map() };
  }

  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .in("id", topicIds)
    .in("status", ["emerging", "active", "fading"]);

  const interestMap =
    zone !== "hybrid"
      ? await fetchTopicInterestStatsMap(supabase, topicIds)
      : new Map();

  const sortedIds = [...topicIds].sort((a, b) => {
    const sa = interestMap.get(a)?.score ?? 0;
    const sb = interestMap.get(b)?.score ?? 0;
    if (sb !== sa) return sb - sa;
    return topicIds.indexOf(a) - topicIds.indexOf(b);
  });

  const byId = new Map(((topics as Topic[]) ?? []).map((t) => [t.id, t]));
  const topicList = sortedIds
    .map((id) => byId.get(id))
    .filter((t): t is Topic => !!t);

  return { topics: topicList, postIdByTopic, interestMap };
}

export type HotTopicItem = {
  topicId: string;
  postId: string;
  title: string;
  industry: string | null;
  replyCount: number;
  totalVotes: number;
  score: number;
  inIdealNation?: boolean;
};

/** 灵感广场热门话题：按 ☆ 热度、回复数、时间排序 */
export async function fetchHotTopics(
  supabase: SupabaseClient,
  limit = 10
): Promise<HotTopicItem[]> {
  const { data: roots } = await supabase
    .from("posts")
    .select("id, topic_id, created_at, topics(id, title, industry)")
    .is("parent_id", null)
    .eq("hidden", false)
    .not("topic_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(120);

  type TopicJoin = { id: string; title: string; industry: string | null };
  const byTopic = new Map<
    string,
    {
      postId: string;
      createdAt: string;
      title: string;
      industry: string | null;
    }
  >();

  for (const row of roots || []) {
    const topicId = row.topic_id as string;
    if (byTopic.has(topicId)) continue;

    const topics = row.topics as TopicJoin | TopicJoin[] | null;
    const t = Array.isArray(topics) ? topics[0] : topics;
    if (!t?.title?.trim()) continue;

    byTopic.set(topicId, {
      postId: row.id as string,
      createdAt: row.created_at as string,
      title: t.title.trim(),
      industry: t.industry ?? null,
    });
  }

  const topicIds = [...byTopic.keys()];
  if (!topicIds.length) return [];

  const [interestMap, promotedTopics] = await Promise.all([
    fetchTopicInterestStatsMap(supabase, topicIds),
    fetchAllPromotedTopicIdSet(supabase),
  ]);
  const postIds = [...byTopic.values()].map((v) => v.postId);

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

  const ranked = topicIds
    .map((topicId) => {
      const meta = byTopic.get(topicId)!;
      const stats = interestMap.get(topicId);
      return {
        topicId,
        postId: meta.postId,
        title: meta.title,
        industry: meta.industry,
        replyCount: replyCounts.get(meta.postId) ?? 0,
        totalVotes: stats?.totalVotes ?? 0,
        score: stats?.score ?? 0,
        createdAt: meta.createdAt,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      if (b.replyCount !== a.replyCount) return b.replyCount - a.replyCount;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit)
    .map(({ createdAt: _c, ...rest }) => ({
      ...rest,
      inIdealNation: promotedTopics.has(rest.topicId),
    }));

  return ranked;
}
