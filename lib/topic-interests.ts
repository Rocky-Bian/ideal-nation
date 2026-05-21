import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorType } from "./types";

/** AI 票在综合热度中的权重（人类 = 1，与 AI 同等） */
export const AI_INTEREST_WEIGHT = 1;

export type TopicInterestStats = {
  humanCount: number;
  aiCount: number;
  totalVotes: number;
  score: number;
  interested: boolean;
};

export function computeInterestScore(humanCount: number, aiCount: number): number {
  return Math.round((humanCount + aiCount * AI_INTEREST_WEIGHT) * 10) / 10;
}

export async function fetchTopicInterestStatsMap(
  supabase: SupabaseClient,
  topicIds: string[],
  viewer?: { voterType: AuthorType; voterId: string }
): Promise<Map<string, TopicInterestStats>> {
  const map = new Map<string, TopicInterestStats>();
  if (!topicIds.length) return map;

  for (const id of topicIds) {
    map.set(id, {
      humanCount: 0,
      aiCount: 0,
      totalVotes: 0,
      score: 0,
      interested: false,
    });
  }

  const { data: rows } = await supabase
    .from("topic_interests")
    .select("topic_id, voter_type, voter_id")
    .in("topic_id", topicIds);

  for (const row of rows || []) {
    const tid = row.topic_id as string;
    const stats = map.get(tid);
    if (!stats) continue;

    if (row.voter_type === "human") stats.humanCount += 1;
    else stats.aiCount += 1;

    if (
      viewer &&
      row.voter_type === viewer.voterType &&
      row.voter_id === viewer.voterId
    ) {
      stats.interested = true;
    }
  }

  for (const stats of map.values()) {
    stats.totalVotes = stats.humanCount + stats.aiCount;
    stats.score = computeInterestScore(stats.humanCount, stats.aiCount);
  }

  return map;
}

export async function fetchTopicInterestStats(
  supabase: SupabaseClient,
  topicId: string,
  viewer?: { voterType: AuthorType; voterId: string }
): Promise<TopicInterestStats> {
  const map = await fetchTopicInterestStatsMap(supabase, [topicId], viewer);
  return (
    map.get(topicId) ?? {
      humanCount: 0,
      aiCount: 0,
      totalVotes: 0,
      score: 0,
      interested: false,
    }
  );
}

/** 话题是否有灵感广场主帖（可点感兴趣） */
export async function getTopicSourceZone(
  supabase: SupabaseClient,
  topicId: string
): Promise<"human" | "ai" | "plaza" | null> {
  const { data: roots } = await supabase
    .from("posts")
    .select("zone")
    .eq("topic_id", topicId)
    .is("parent_id", null)
    .eq("hidden", false)
    .in("zone", ["plaza", "human", "ai"])
    .order("created_at", { ascending: true })
    .limit(1);

  const zone = roots?.[0]?.zone;
  if (zone === "human" || zone === "ai" || zone === "plaza") return zone;
  return null;
}

export async function assertTopicAllowsInterest(
  supabase: SupabaseClient,
  topicId: string
): Promise<
  { ok: true; zone: "human" | "ai" | "plaza" } | { ok: false; error: string }
> {
  const zone = await getTopicSourceZone(supabase, topicId);
  if (!zone) {
    return {
      ok: false,
      error: "仅灵感广场话题可标记感兴趣",
    };
  }
  return { ok: true, zone };
}

export async function setTopicInterest(
  supabase: SupabaseClient,
  params: {
    topicId: string;
    voterType: AuthorType;
    voterId: string;
    interested: boolean;
  }
): Promise<void> {
  const { topicId, voterType, voterId, interested } = params;

  if (interested) {
    const { error } = await supabase.from("topic_interests").insert({
      topic_id: topicId,
      voter_type: voterType,
      voter_id: voterId,
    });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase
    .from("topic_interests")
    .delete()
    .eq("topic_id", topicId)
    .eq("voter_type", voterType)
    .eq("voter_id", voterId);

  if (error) throw error;
}
