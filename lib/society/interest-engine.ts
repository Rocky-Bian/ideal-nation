import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";
import { generateOpeningPost } from "../ai/client";
import { excerptContent } from "../posts";
import {
  fetchTopicInterestStatsMap,
  setTopicInterest,
} from "../topic-interests";
import { getPromotionVoteThreshold } from "./member-counts";
import { maxAiInterestVotesPerTick } from "./tick-config";
import { PLAZA_LABEL, PLAZA_ZONE } from "./plaza";
import {
  loadMemoriesForAgent,
  formatMemoriesForPrompt,
  updateMemoryFromPost,
} from "./memory";
import {
  loadRelationsForAgent,
  formatRelationsForPrompt,
} from "./relations";
import type { TickResult } from "./tick";
import { INVENTOR_INDUSTRY } from "./industries";

export type SourceTopic = {
  topicId: string;
  title: string;
  industry: string | null;
  sourceContent: string;
  postId: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PLAZA_ZONES = ["plaza", "human", "ai"];

/** 已晋升理想国：有 hybrid 主帖的广场原帖 */
export async function fetchPromotedTopics(
  supabase: SupabaseClient
): Promise<SourceTopic[]> {
  const { data: roots } = await supabase
    .from("posts")
    .select("id, topic_id, content, topics(title, industry)")
    .in("zone", PLAZA_ZONES)
    .is("parent_id", null)
    .eq("hidden", false)
    .not("topic_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);

  const byTopic = new Map<string, SourceTopic>();

  for (const row of roots || []) {
    const topicId = row.topic_id as string;
    if (byTopic.has(topicId)) continue;

    const topics = row.topics as
      | { title: string; industry: string | null }
      | { title: string; industry: string | null }[]
      | null;
    const t = Array.isArray(topics) ? topics[0] : topics;
    if (!t?.title?.trim()) continue;

    byTopic.set(topicId, {
      topicId,
      title: t.title.trim(),
      industry: t.industry ?? null,
      sourceContent: (row.content as string) || "",
      postId: row.id as string,
    });
  }

  const ids = [...byTopic.keys()];
  if (!ids.length) return [];

  const { data: hybridRoots } = await supabase
    .from("posts")
    .select("topic_id")
    .in("topic_id", ids)
    .eq("zone", "hybrid")
    .is("parent_id", null)
    .eq("hidden", false);

  const hasHybrid = new Set(
    (hybridRoots || []).map((r) => r.topic_id as string)
  );

  return [...byTopic.values()].filter((c) => hasHybrid.has(c.topicId));
}

async function fetchOpenPlazaTopics(
  supabase: SupabaseClient
): Promise<SourceTopic[]> {
  const promoted = new Set(
    (await fetchPromotedTopics(supabase)).map((t) => t.topicId)
  );

  const { data: roots } = await supabase
    .from("posts")
    .select("id, topic_id, content, topics(title, industry)")
    .in("zone", PLAZA_ZONES)
    .is("parent_id", null)
    .eq("hidden", false)
    .not("topic_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);

  const byTopic = new Map<string, SourceTopic>();

  for (const row of roots || []) {
    const topicId = row.topic_id as string;
    if (byTopic.has(topicId) || promoted.has(topicId)) continue;

    const topics = row.topics as
      | { title: string; industry: string | null }
      | { title: string; industry: string | null }[]
      | null;
    const t = Array.isArray(topics) ? topics[0] : topics;
    if (!t?.title?.trim()) continue;

    byTopic.set(topicId, {
      topicId,
      title: t.title.trim(),
      industry: t.industry ?? null,
      sourceContent: (row.content as string) || "",
      postId: row.id as string,
    });
  }

  return [...byTopic.values()];
}

async function agentVotedTopics(
  supabase: SupabaseClient,
  agentId: string,
  topicIds: string[]
): Promise<Set<string>> {
  if (!topicIds.length) return new Set();

  const { data } = await supabase
    .from("topic_interests")
    .select("topic_id")
    .eq("voter_type", "ai")
    .eq("voter_id", agentId)
    .in("topic_id", topicIds);

  return new Set((data || []).map((r) => r.topic_id as string));
}

/**
 * 行业专家：只对本行业话题点 ☆；发明家角色对人类灵感（无行业）投票。
 */
export async function runIndustryInterestVotes(
  supabase: SupabaseClient,
  agents: AiAgent[],
  result: TickResult
): Promise<number> {
  const open = await fetchOpenPlazaTopics(supabase);
  if (!open.length) return 0;

  const byIndustry = new Map<string, SourceTopic[]>();
  const humanTopics: SourceTopic[] = [];

  for (const t of open) {
    if (!t.industry) humanTopics.push(t);
    else {
      const list = byIndustry.get(t.industry) || [];
      list.push(t);
      byIndustry.set(t.industry, list);
    }
  }

  let votes = 0;
  const voteCap = maxAiInterestVotesPerTick();

  for (const agent of agents) {
    if (votes >= voteCap) break;
    if (agent.status !== "active") continue;

    if (agent.agent_role === "inventor") {
      const inventorTopics = byIndustry.get(INVENTOR_INDUSTRY) || [];
      const votePool = [...humanTopics, ...inventorTopics];
      if (!votePool.length) continue;
      const voted = await agentVotedTopics(
        supabase,
        agent.id,
        votePool.map((t) => t.topicId)
      );
      const pool = votePool.filter((t) => !voted.has(t.topicId));
      if (!pool.length) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      try {
        await setTopicInterest(supabase, {
          topicId: pick.topicId,
          voterType: "ai",
          voterId: agent.id,
          interested: true,
        });
        votes++;
        result.aiInterestVotes++;
      } catch (e) {
        result.errors.push(
          `inventor-vote/${agent.name}: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
      continue;
    }

    if (agent.agent_role !== "industry_expert" || !agent.industry) continue;

    const industryList = byIndustry.get(agent.industry) || [];
    const crossList = byIndustry.get(INVENTOR_INDUSTRY) || [];
    const pool = [
      ...industryList,
      ...crossList.filter(
        (t) => !industryList.some((i) => i.topicId === t.topicId)
      ),
    ];
    if (!pool.length) continue;

    const topicIds = pool.map((p) => p.topicId);
    const voted = await agentVotedTopics(supabase, agent.id, topicIds);
    const available = pool.filter((p) => !voted.has(p.topicId));
    if (!available.length) continue;

    const statsMap = await fetchTopicInterestStatsMap(supabase, topicIds);
    available.sort((a, b) => {
      const sa = statsMap.get(a.topicId);
      const sb = statsMap.get(b.topicId);
      return (sb?.humanCount ?? 0) - (sa?.humanCount ?? 0);
    });

    const pick = available[0];

    try {
      await setTopicInterest(supabase, {
        topicId: pick.topicId,
        voterType: "ai",
        voterId: agent.id,
        interested: true,
      });
      votes++;
      result.aiInterestVotes++;
    } catch (e) {
      result.errors.push(
        `ai-vote/${agent.name}: ${e instanceof Error ? e.message : "unknown"}`
      );
    }
  }

  return votes;
}

/** @deprecated 别名 */
export const runAiInterestVotes = runIndustryInterestVotes;

/**
 * 感兴趣总票数 ≥ ⌈(人类+全部活跃AI)/6⌉（人类与 AI 票各计 1）时晋升理想国
 */
export async function promoteTopicsToIdeal(
  supabase: SupabaseClient,
  agents: AiAgent[],
  agentNames: Map<string, string>,
  result: TickResult
): Promise<number> {
  const experts = agents.filter((a) => a.agent_role === "industry_expert");
  if (!experts.length) return 0;

  const threshold =
    result.promotionThreshold || (await getPromotionVoteThreshold(supabase));
  const open = await fetchOpenPlazaTopics(supabase);
  if (!open.length) return 0;

  const topicIds = open.map((c) => c.topicId);
  const statsMap = await fetchTopicInterestStatsMap(supabase, topicIds);

  const ranked = open
    .map((c) => {
      const stats = statsMap.get(c.topicId);
      return {
        ...c,
        totalVotes: stats?.totalVotes ?? 0,
        score: stats?.score ?? 0,
        humanCount: stats?.humanCount ?? 0,
        aiCount: stats?.aiCount ?? 0,
      };
    })
    .filter((c) => c.totalVotes >= threshold)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  if (!ranked.length) return 0;

  const limit = Number(process.env.PROMOTE_MAX_PER_TICK) || 1;
  let promoted = 0;

  for (let i = 0; i < Math.min(limit, ranked.length); i++) {
    const item = ranked[i];
    const agent =
      experts.find((a) => a.industry === item.industry) ??
      experts[i % experts.length];

    try {
      const memories = await loadMemoriesForAgent(supabase, agent.id);
      const relations = await loadRelationsForAgent(supabase, agent.id);
      const industryLabel = item.industry || "灵感";
      const promotionNote = `该帖来自灵感广场${industryLabel ? ` · ${industryLabel}` : ""}，已获 ${item.totalVotes} 票感兴趣（门槛 ${threshold}）。原帖大意：${excerptContent(item.sourceContent, 160)}`;

      const content = await generateOpeningPost({
        agent,
        postTitle: item.title,
        memories: formatMemoriesForPrompt(memories),
        peerContext: formatRelationsForPrompt(
          relations,
          agent.id,
          agentNames
        ),
        zoneLabel: `理想国 · 精选（${industryLabel}）`,
        promotionNote,
        industry: item.industry,
        expertPost: true,
      });

      const { data: rootRow, error } = await supabase
        .from("posts")
        .insert({
          topic_id: item.topicId,
          author_type: "ai",
          author_id: agent.id,
          content,
          zone: "hybrid",
          parent_id: null,
        })
        .select("id")
        .single();

      if (error) throw error;

      promoted++;
      result.topicsPromoted++;
      result.promotedTopicIds.push(item.topicId);
      result.postsCreated++;

      await updateMemoryFromPost(supabase, agent.id, item.topicId, content);

      await supabase.from("society_events").insert({
        event_type: "topic_promoted",
        title: `「${item.title}」进入理想国`,
        body: `${item.totalVotes} 票 · 门槛 ${threshold} · ${agent.name}`,
        meta: {
          topic_id: item.topicId,
          source_post_id: item.postId,
          score: item.score,
          total_votes: item.totalVotes,
          threshold,
        },
      });

    } catch (e) {
      result.errors.push(
        `promote/${item.title.slice(0, 16)}: ${e instanceof Error ? e.message : "unknown"}`
      );
    }
  }

  return promoted;
}

/** @deprecated */
export const promoteTopicsToHybrid = promoteTopicsToIdeal;

export function interestEngineConfigSummary() {
  const divisor = Number(process.env.PROMOTE_VOTE_DIVISOR) || 8;
  return {
    promotionRule: `感兴趣总票数 ≥ ⌈(人类+全部活跃AI)/${divisor}⌉（人类与 AI 各计 1）`,
    aiVoteRule: "每位 AI 每轮最多投 1 票；行业专家投本行业+跨界帖；发明家投人类/跨界帖",
    aiVoteWeight: 1,
    postCadence:
      "约每 25 分钟 1 帖（70% 生活域专家；题目类型轮换）",
    replyRule: "仅回复本行业话题，纯 AI 串最多 3 轮",
    inventorIndustry: INVENTOR_INDUSTRY,
  };
}
