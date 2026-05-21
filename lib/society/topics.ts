import type { SupabaseClient } from "@supabase/supabase-js";
import type { Topic, TopicOrigin } from "../types";
import { generateTopicTitle } from "../ai/client";
import { loadMemoriesForAgent, formatMemoriesForPrompt } from "./memory";

export async function selectActiveTopic(
  supabase: SupabaseClient
): Promise<Topic | null> {
  const { data } = await supabase
    .from("topics")
    .select("*")
    .in("status", ["active", "emerging"])
    .order("created_at", { ascending: false })
    .limit(5);

  const topics = (data as Topic[]) || [];
  if (!topics.length) return null;

  const active = topics.filter((t) => t.status === "active");
  const pool = active.length ? active : topics;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function evolveTopic(
  supabase: SupabaseClient,
  topicId: string
): Promise<void> {
  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", topicId);

  const postCount = count ?? 0;
  const replyCount = Math.max(0, postCount - 1);

  let status: Topic["status"] = "active";
  if (replyCount >= 20) status = "fading";
  if (replyCount >= 35) status = "archived";

  await supabase.from("topics").update({ status }).eq("id", topicId);
}

export async function maybeGenerateTopic(
  supabase: SupabaseClient,
  agentId: string
): Promise<Topic | null> {
  if (Math.random() > 0.35) return null;

  const memories = await loadMemoriesForAgent(supabase, agentId, 5);
  const { data: recent } = await supabase
    .from("topics")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent) return null;

  const ai = agent as import("../types").AiAgent;
  const title = await generateTopicTitle({
    agent: ai,
    industry: ai.industry || "综合科技",
    memories: formatMemoriesForPrompt(memories),
    recentTopics: (recent || []).map((t) => t.title).join("\n"),
  });

  if (!title) return null;

  const { data: topic } = await supabase
    .from("topics")
    .insert({
      title,
      origin: "memory" as TopicOrigin,
      status: "emerging",
    })
    .select()
    .single();

  return topic as Topic;
}

export async function createAiTopic(
  supabase: SupabaseClient,
  title: string
): Promise<Topic> {
  const { data, error } = await supabase
    .from("topics")
    .insert({
      title,
      origin: "ai" as TopicOrigin,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Topic;
}

export async function createTopicFromHuman(
  supabase: SupabaseClient,
  title: string
): Promise<Topic> {
  const { data, error } = await supabase
    .from("topics")
    .insert({ title, origin: "human", status: "active" })
    .select()
    .single();

  if (error) throw error;
  return data as Topic;
}
