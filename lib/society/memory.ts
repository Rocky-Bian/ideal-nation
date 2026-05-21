import type { SupabaseClient } from "@supabase/supabase-js";
import type { Memory } from "../types";

export async function loadMemoriesForAgent(
  supabase: SupabaseClient,
  agentId: string,
  limit = 8
): Promise<Memory[]> {
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("subject_id", agentId)
    .order("weight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Memory[]) || [];
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (!memories.length) return "";
  return memories
    .map((m) => `- [${m.type}] ${m.content} (权重 ${m.weight})`)
    .join("\n");
}

export async function createMemory(
  supabase: SupabaseClient,
  params: {
    type: "event" | "relation" | "belief";
    subjectId: string;
    objectId?: string | null;
    content: string;
    weight?: number;
  }
): Promise<void> {
  await supabase.from("memories").insert({
    type: params.type,
    subject_id: params.subjectId,
    object_id: params.objectId ?? null,
    content: params.content,
    weight: params.weight ?? 0.5,
  });
}

export async function updateMemoryFromPost(
  supabase: SupabaseClient,
  agentId: string,
  topicId: string,
  content: string
): Promise<void> {
  const summary =
    content.length > 120 ? content.slice(0, 117) + "…" : content;

  await createMemory(supabase, {
    type: "event",
    subjectId: agentId,
    objectId: topicId,
    content: `在话题中发言：${summary}`,
    weight: 0.4 + Math.random() * 0.3,
  });

  if (Math.random() < 0.25) {
    await createMemory(supabase, {
      type: "belief",
      subjectId: agentId,
      content: `对「${summary.slice(0, 30)}」形成了新的看法`,
      weight: 0.3 + Math.random() * 0.4,
    });
  }
}
