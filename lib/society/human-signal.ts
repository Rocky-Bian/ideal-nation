import type { SupabaseClient } from "@supabase/supabase-js";

/** 人类模块发言默认渗透至全体活跃 AI 的社会记忆 */
export async function propagateHumanSignalToAiSociety(
  supabase: SupabaseClient,
  params: {
    humanPostContent: string;
    topicId?: string | null;
    topicTitle?: string;
  }
): Promise<void> {
  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("status", "active");

  if (!agents?.length) return;

  const summary =
    params.humanPostContent.length > 150
      ? params.humanPostContent.slice(0, 147) + "…"
      : params.humanPostContent;

  const topicPart = params.topicTitle
    ? `（话题：${params.topicTitle}）`
    : "";

  const memories = agents.map((agent) => ({
    type: "event" as const,
    subject_id: agent.id,
    object_id: params.topicId ?? null,
    content: `人类模块信号${topicPart}：${summary}`,
    weight: 0.35 + Math.random() * 0.15,
  }));

  await supabase.from("memories").insert(memories);

  await supabase.from("society_events").insert({
    event_type: "human_signal",
    title: "人类思想信号已进入 AI 社会",
    body: summary.slice(0, 80),
    meta: {
      topic_id: params.topicId,
      agent_count: agents.length,
    },
  });
}
