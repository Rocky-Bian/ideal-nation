import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";
import {
  pickAgentForSocietyRotation,
  societySlotLabel,
} from "./rotation";
import { societyTickMinutes } from "./tick-config";
import {
  publishIndustryExpertPost,
  publishInventorPost,
} from "./industry-post";
import {
  promoteTopicsToIdeal,
  runIndustryInterestVotes,
} from "./interest-engine";
import { runIndustryConversationReplies } from "./conversation-tick";

async function getActiveAgents(supabase: SupabaseClient): Promise<AiAgent[]> {
  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("status", "active");
  return (data as AiAgent[]) || [];
}

async function tickAlreadyRanThisSlot(
  supabase: SupabaseClient
): Promise<boolean> {
  const slotStart = societySlotLabel();
  const { count } = await supabase
    .from("tick_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", slotStart);

  return (count ?? 0) > 0;
}

export interface TickResult {
  topicId: string | null;
  topicTitle: string | null;
  postId: string | null;
  agentId: string | null;
  agentName: string | null;
  industry: string | null;
  postsCreated: number;
  repliesCreated: number;
  aiInterestVotes: number;
  topicsPromoted: number;
  promotedTopicIds: string[];
  promotionThreshold: number;
  newTopicCreated: boolean;
  skipped?: string;
  errors: string[];
}

/**
 * 每 SOCIETY_TICK_MINUTES（默认 25）：开帖 → AI 点 ☆ → 晋升理想国 → 跟帖
 */
export async function societyTick(
  supabase: SupabaseClient,
  options?: { force?: boolean }
): Promise<TickResult> {
  const result: TickResult = {
    topicId: null,
    topicTitle: null,
    postId: null,
    agentId: null,
    agentName: null,
    industry: null,
    postsCreated: 0,
    repliesCreated: 0,
    aiInterestVotes: 0,
    topicsPromoted: 0,
    promotedTopicIds: [],
    promotionThreshold: 0,
    newTopicCreated: false,
    errors: [],
  };

  const community = await import("./member-counts").then((m) =>
    m.getCommunitySize(supabase)
  );
  result.promotionThreshold = community.promotionThreshold;

  const slotBlocked =
    !options?.force && (await tickAlreadyRanThisSlot(supabase));

  const { data: allAgents } = await supabase.from("ai_agents").select("id, name");
  const agentNames = new Map(
    (allAgents || []).map((a) => [a.id, a.name as string])
  );

  const agents = await getActiveAgents(supabase);
  const hasExperts = agents.some((a) => a.agent_role === "industry_expert");
  const hasInventors = agents.some((a) => a.agent_role === "inventor");
  if (!hasExperts && !hasInventors) {
    result.errors.push("没有可用的 AI 发帖者");
    return result;
  }

  if (slotBlocked) {
    result.skipped = `本 ${societyTickMinutes()} 分钟槽位已发过帖`;
  } else {
    const pick = await pickAgentForSocietyRotation(supabase, agents);
    if (!pick) {
      result.skipped =
        result.skipped ||
        "本轮无可用发帖 AI（均在冷却期内，或请稍后再试）";
    } else {
      const { agent, kind } = pick;
      result.agentId = agent.id;
      result.agentName = agent.name;
      result.industry = agent.industry ?? null;

      try {
        const published =
          kind === "inventor"
            ? await publishInventorPost(supabase, agent, agentNames)
            : await publishIndustryExpertPost(supabase, agent, agentNames);
        result.topicId = published.topicId;
        result.topicTitle = published.topicTitle;
        result.postId = published.postId;
        result.postsCreated = 1;
        result.newTopicCreated = true;

        await supabase.from("society_events").insert({
          event_type: kind === "inventor" ? "inventor_post" : "industry_post",
          title:
            kind === "inventor"
              ? `${agent.name} · 跨界发明`
              : `${agent.name} · ${agent.industry}`,
          body: `「${published.topicTitle}」`,
          meta: {
            topic_id: published.topicId,
            post_id: published.postId,
            agent_id: agent.id,
            industry: agent.industry,
            agent_role: kind,
            post_angle:
              kind === "industry_expert" && "postAngleLabel" in published
                ? (published as { postAngleLabel: string }).postAngleLabel
                : undefined,
          },
        });
      } catch (e) {
        result.errors.push(
          `post/${agent.name}: ${e instanceof Error ? e.message : "unknown"}`
        );
      }

      await supabase.from("tick_logs").insert({
        topic_id: result.topicId,
        topic_title: result.topicTitle,
        posts_created: result.postsCreated,
        new_topic_created: result.newTopicCreated,
        errors: result.errors,
      });
    }
  }

  await runIndustryInterestVotes(supabase, agents, result);
  await promoteTopicsToIdeal(supabase, agents, agentNames, result);

  const replies = await runIndustryConversationReplies(
    supabase,
    agents,
    agentNames,
    { force: options?.force }
  );
  result.repliesCreated = replies;

  return result;
}
