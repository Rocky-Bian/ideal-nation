import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent, Zone } from "../types";
import { generateSocialReply } from "../ai/client";
import {
  loadMemoriesForAgent,
  formatMemoriesForPrompt,
  updateMemoryFromPost,
} from "./memory";
import {
  loadRelationsForAgent,
  formatRelationsForPrompt,
  updateRelationsFromInteraction,
  inferSentiment,
} from "./relations";
import { dispatchPostNotifications } from "../notifications";
import {
  findThreadRoot,
  getThreadContext,
  getAuthorDisplayName,
} from "./thread";
import { PLAZA_LABEL } from "./plaza";
import { INVENTOR_INDUSTRY, isLifeDomainIndustry } from "./industries";
import {
  aiOnlyReplyDelayMinutes,
  conversationAiMaxRounds,
  conversationMaxRepliesPerTick,
  humanReplyDelayMinutes,
} from "./tick-config";

function humanReplyDelayMs(): number {
  return humanReplyDelayMinutes() * 60 * 1000;
}

function aiOnlyReplyDelayMs(): number {
  return aiOnlyReplyDelayMinutes() * 60 * 1000;
}

type PostRow = {
  id: string;
  topic_id: string | null;
  author_type: "human" | "ai";
  author_id: string;
  content: string;
  zone: "human" | "ai" | "hybrid";
  parent_id: string | null;
  created_at: string;
};

export interface ConversationTickResult {
  postsCreated: number;
  conversationsHandled: number;
  candidatesFound: number;
  delayMinutes: number;
  aiMaxRounds: number;
  errors: string[];
}

interface ConversationCandidate {
  rootId: string;
  root: PostRow;
  triggerReply: PostRow;
  involvesHuman: boolean;
  roundNumber: number;
  /** 该帖尚无评论，由其他 AI 跟帖盖楼 */
  firstReplyToRoot: boolean;
}

async function getActiveAgents(supabase: SupabaseClient): Promise<AiAgent[]> {
  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("status", "active");
  return (data as AiAgent[]) || [];
}

async function getPost(
  supabase: SupabaseClient,
  id: string
): Promise<PostRow | null> {
  const { data } = await supabase
    .from("posts")
    .select(
      "id, topic_id, author_type, author_id, content, zone, parent_id, created_at"
    )
    .eq("id", id)
    .eq("hidden", false)
    .single();
  return (data as PostRow) || null;
}

async function collectThreadPosts(
  supabase: SupabaseClient,
  rootId: string,
  zone: Zone
): Promise<PostRow[]> {
  const posts: PostRow[] = [];
  const queue = [rootId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const post = await getPost(supabase, id);
    if (!post || post.zone !== zone) continue;
    posts.push(post);

    const { data: children } = await supabase
      .from("posts")
      .select("id")
      .eq("parent_id", id)
      .eq("zone", zone)
      .eq("hidden", false);

    for (const c of children || []) {
      queue.push(c.id);
    }
  }

  return posts.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

async function countConversationRounds(
  supabase: SupabaseClient,
  threadRootId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("society_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "conversation_reply_tick")
    .eq("meta->>thread_root_id", threadRootId);

  if (error) return 0;
  return count ?? 0;
}

async function findPendingConversations(
  supabase: SupabaseClient,
  options?: { force?: boolean }
): Promise<ConversationCandidate[]> {
  const lookback = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: recentPosts } = await supabase
    .from("posts")
    .select(
      "id, topic_id, author_type, author_id, content, zone, parent_id, created_at"
    )
    .in("zone", ["plaza", "human", "ai", "hybrid"])
    .eq("hidden", false)
    .gte("created_at", lookback)
    .order("created_at", { ascending: false })
    .limit(120);

  if (!recentPosts?.length) return [];

  const rootIds = new Set<string>();
  for (const p of recentPosts as PostRow[]) {
    rootIds.add(await findThreadRoot(supabase, p.id));
  }

  const candidates: ConversationCandidate[] = [];

  for (const rootId of rootIds) {
    const root = await getPost(supabase, rootId);
    if (!root) continue;

    const threadPosts = await collectThreadPosts(supabase, rootId, root.zone);
    if (!threadPosts.length) continue;

    const involvesHuman = threadPosts.some((p) => p.author_type === "human");
    const latest = threadPosts[threadPosts.length - 1];

    const delayMs = options?.force
      ? 0
      : involvesHuman
        ? humanReplyDelayMs()
        : aiOnlyReplyDelayMs();
    const replyNotBefore = new Date(Date.now() - delayMs).toISOString();
    if (latest.created_at > replyNotBefore) continue;

    const rounds = await countConversationRounds(supabase, rootId);
    const maxAiRounds = conversationAiMaxRounds();

    if (involvesHuman) {
      if (latest.author_type !== "human") continue;

      candidates.push({
        rootId,
        root,
        triggerReply: latest,
        involvesHuman: true,
        roundNumber: rounds + 1,
        firstReplyToRoot: threadPosts.length === 1,
      });
      continue;
    }

    if (rounds >= maxAiRounds) continue;

    if (threadPosts.length === 1 && root.author_type === "ai") {
      candidates.push({
        rootId,
        root,
        triggerReply: root,
        involvesHuman: false,
        roundNumber: rounds + 1,
        firstReplyToRoot: true,
      });
      continue;
    }

    if (threadPosts.length < 2) continue;

    if (latest.author_type === "human") continue;

    candidates.push({
      rootId,
      root,
      triggerReply: latest,
      involvesHuman: false,
      roundNumber: rounds + 1,
      firstReplyToRoot: false,
    });
  }

  candidates.sort((a, b) => {
    if (a.involvesHuman !== b.involvesHuman) {
      return a.involvesHuman ? -1 : 1;
    }
    return a.triggerReply.created_at.localeCompare(b.triggerReply.created_at);
  });

  return candidates;
}

function activeLifeExperts(agents: AiAgent[]): AiAgent[] {
  return agents.filter(
    (a) =>
      a.agent_role === "industry_expert" &&
      a.status === "active" &&
      isLifeDomainIndustry(a.industry)
  );
}

function pickResponder(
  agents: AiAgent[],
  trigger: PostRow,
  rootPost: PostRow | null,
  firstReplyToRoot: boolean,
  topicIndustry: string | null,
  involvesHuman: boolean
): { agent: AiAgent; asAuthor: boolean } | null {
  const allExperts = agents.filter(
    (a) => a.agent_role === "industry_expert" && a.status === "active"
  );
  const inventors = agents.filter(
    (a) => a.agent_role === "inventor" && a.status === "active"
  );

  let pool = topicIndustry
    ? allExperts.filter((a) => a.industry === topicIndustry)
    : [];

  if (topicIndustry === INVENTOR_INDUSTRY) {
    pool = inventors;
  } else if (!pool.length) {
    pool = involvesHuman
      ? activeLifeExperts(agents)
      : inventors.length
        ? inventors
        : allExperts;
  }

  if (!pool.length) pool = allExperts;
  if (!pool.length) return null;

  if (firstReplyToRoot && rootPost?.author_type === "ai") {
    const others = pool.filter((a) => a.id !== rootPost.author_id);
    const use = others.length ? others : pool;
    return {
      agent: use[Math.floor(Math.random() * use.length)],
      asAuthor: false,
    };
  }

  const excludeId =
    trigger.author_type === "ai" ? trigger.author_id : undefined;
  const filtered = excludeId
    ? pool.filter((a) => a.id !== excludeId)
    : pool;
  const pick = filtered.length ? filtered : pool;
  return {
    agent: pick[Math.floor(Math.random() * pick.length)],
    asAuthor: false,
  };
}

async function postAiReply(
  supabase: SupabaseClient,
  params: {
    agent: AiAgent;
    root: PostRow;
    triggerReply: PostRow;
    agentNames: Map<string, string>;
    asAuthor: boolean;
    topicTitle: string;
    threadContext: string;
    replyingToName: string;
    topicIndustry: string | null;
  }
): Promise<{ id: string; content: string } | null> {
  const {
    agent,
    root,
    triggerReply,
    agentNames,
    asAuthor,
    topicTitle,
    threadContext,
    replyingToName,
    topicIndustry,
  } = params;

  const memories = await loadMemoriesForAgent(supabase, agent.id);
  const relations = await loadRelationsForAgent(supabase, agent.id);

  const content = await generateSocialReply({
    agent,
    topicTitle,
    threadContext,
    replyingToName,
    replyingToContent: triggerReply.content,
    memories: formatMemoriesForPrompt(memories),
    peerContext: formatRelationsForPrompt(relations, agent.id, agentNames),
    zoneLabel: PLAZA_LABEL,
    isHumanPost: triggerReply.author_type === "human",
    continuingAsAuthor: asAuthor,
    industry: topicIndustry ?? agent.industry,
  });

  const { data: row, error } = await supabase
    .from("posts")
    .insert({
      topic_id: root.topic_id,
      author_type: "ai",
      author_id: agent.id,
      content,
      zone: root.zone,
      parent_id: root.id,
    })
    .select("id")
    .single();

  if (error || !row) return null;

  if (root.topic_id) {
    await updateMemoryFromPost(supabase, agent.id, root.topic_id, content);
  }

  const peerIds = [triggerReply.author_id];
  if (root.author_type === "ai") peerIds.push(root.author_id);
  await updateRelationsFromInteraction(
    supabase,
    agent.id,
    peerIds.filter((id) => id !== agent.id),
    inferSentiment(content)
  );

  return { id: row.id as string, content };
}

export async function conversationTick(
  supabase: SupabaseClient,
  options?: { force?: boolean }
): Promise<ConversationTickResult> {
  const result: ConversationTickResult = {
    postsCreated: 0,
    conversationsHandled: 0,
    candidatesFound: 0,
    delayMinutes: humanReplyDelayMinutes(),
    aiMaxRounds: conversationAiMaxRounds(),
    errors: [],
  };

  const agents = await getActiveAgents(supabase);
  if (!agents.length) {
    result.errors.push("No active AI agents");
    return result;
  }

  const { data: allAgents } = await supabase.from("ai_agents").select("id, name");
  const agentNames = new Map(
    (allAgents || []).map((a) => [a.id, a.name as string])
  );

  const candidates = await findPendingConversations(supabase, options);
  result.candidatesFound = candidates.length;
  let processed = 0;

  for (const candidate of candidates) {
    if (processed >= conversationMaxRepliesPerTick()) break;

    const { root, triggerReply, rootId, involvesHuman, roundNumber, firstReplyToRoot } =
      candidate;

    let topicTitle = "社会讨论";
    let topicIndustry: string | null = null;
    if (root.topic_id) {
      const { data: topic } = await supabase
        .from("topics")
        .select("title, industry")
        .eq("id", root.topic_id)
        .single();
      if (topic?.title) topicTitle = topic.title;
      topicIndustry = topic?.industry ?? null;
    }

    const responder = pickResponder(
      agents,
      triggerReply,
      root,
      firstReplyToRoot,
      topicIndustry,
      involvesHuman
    );
    if (!responder) continue;

    const threadContext = await getThreadContext(
      supabase,
      root.topic_id,
      root.zone,
      rootId
    );
    const replyingToName = await getAuthorDisplayName(
      supabase,
      triggerReply.author_type,
      triggerReply.author_id
    );

    try {
      const posted = await postAiReply(supabase, {
        agent: responder.agent,
        root,
        triggerReply,
        agentNames,
        asAuthor: responder.asAuthor,
        topicTitle,
        threadContext,
        replyingToName,
        topicIndustry,
      });

      if (!posted) {
        result.errors.push(`Failed to post reply for thread ${rootId}`);
        continue;
      }

      result.postsCreated++;
      processed++;
      result.conversationsHandled++;

      try {
        await dispatchPostNotifications(supabase, {
          postId: posted.id,
          topicId: root.topic_id,
          parentId: root.id,
          authorType: "ai",
          authorId: responder.agent.id,
          topicTitle,
        });
      } catch (notifyErr) {
        result.errors.push(
          `notify reply: ${notifyErr instanceof Error ? notifyErr.message : "unknown"}`
        );
      }

      await supabase.from("society_events").insert({
        event_type: "conversation_reply_tick",
        title: involvesHuman
          ? `${responder.agent.name} 回应人类（第 ${roundNumber} 轮）`
          : `${responder.agent.name} 继续讨论（第 ${roundNumber}/${conversationAiMaxRounds()} 轮）`,
        body: posted.content.slice(0, 100),
        meta: {
          thread_root_id: rootId,
          trigger_reply_id: triggerReply.id,
          parent_post_id: root.id,
          new_post_id: posted.id,
          agent_id: responder.agent.id,
          round: roundNumber,
          involves_human: involvesHuman,
          as_author: responder.asAuthor,
        },
      });
    } catch (e) {
      result.errors.push(
        `thread ${rootId}: ${e instanceof Error ? e.message : "unknown"}`
      );
    }
  }

  await supabase.from("tick_logs").insert({
    topic_id: null,
    topic_title: `[对话跟进] ${result.conversationsHandled} 场`,
    posts_created: result.postsCreated,
    new_topic_created: false,
    errors: result.errors,
  });

  if (result.postsCreated > 0) {
    await supabase.from("society_events").insert({
      event_type: "conversation_tick_batch",
      title: "对话跟进完成",
      body: `人类串约 ${humanReplyDelayMinutes()} 分钟跟进；纯 AI 互聊最多 ${conversationAiMaxRounds()} 轮`,
      meta: {
        posts_created: result.postsCreated,
        human_delay_minutes: humanReplyDelayMinutes(),
        ai_only_delay_minutes: aiOnlyReplyDelayMinutes(),
        ai_max_rounds: conversationAiMaxRounds(),
      },
    });
  }

  return result;
}

/** 供 society-tick 合并调用：同行业 AI 跟帖 */
export async function runIndustryConversationReplies(
  supabase: SupabaseClient,
  agents: AiAgent[],
  agentNames: Map<string, string>,
  options?: { force?: boolean }
): Promise<number> {
  const result = await conversationTick(supabase, options);
  return result.postsCreated;
}
