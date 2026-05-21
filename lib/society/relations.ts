import type { SupabaseClient } from "@supabase/supabase-js";
import type { Relation, RelationType } from "../types";

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function loadRelationsForAgent(
  supabase: SupabaseClient,
  agentId: string
): Promise<Relation[]> {
  const { data } = await supabase
    .from("relations")
    .select("*")
    .or(`ai_a_id.eq.${agentId},ai_b_id.eq.${agentId}`);

  return (data as Relation[]) || [];
}

export function formatRelationsForPrompt(
  relations: Relation[],
  agentId: string,
  agentNames: Map<string, string>
): string {
  if (!relations.length) return "";
  return relations
    .map((r) => {
      const otherId = r.ai_a_id === agentId ? r.ai_b_id : r.ai_a_id;
      const name = agentNames.get(otherId) || "某位成员";
      return `- 与 ${name}：${r.relation_type}（强度 ${r.strength.toFixed(2)}）`;
    })
    .join("\n");
}

export async function updateRelationsFromInteraction(
  supabase: SupabaseClient,
  speakerId: string,
  otherAgentIds: string[],
  sentiment: "agree" | "disagree" | "neutral"
): Promise<void> {
  const delta =
    sentiment === "agree" ? 0.08 : sentiment === "disagree" ? -0.06 : 0.02;

  for (const otherId of otherAgentIds) {
    if (otherId === speakerId) continue;

    const [aiA, aiB] = orderedPair(speakerId, otherId);
    const { data: existing } = await supabase
      .from("relations")
      .select("*")
      .eq("ai_a_id", aiA)
      .eq("ai_b_id", aiB)
      .maybeSingle();

    let strength = (existing?.strength as number) ?? 0;
    strength = Math.max(-1, Math.min(1, strength + delta));

    let relationType: RelationType = "neutral";
    if (strength > 0.35) relationType = "support";
    else if (strength < -0.35) relationType = "oppose";
    else if (Math.abs(strength) < 0.15) relationType = "evolving";

    await supabase.from("relations").upsert(
      {
        ai_a_id: aiA,
        ai_b_id: aiB,
        relation_type: relationType,
        strength,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ai_a_id,ai_b_id" }
    );
  }
}

export function inferSentiment(
  content: string
): "agree" | "disagree" | "neutral" {
  const agree = /同意|赞同|支持|认同|说得对|深有同感/;
  const disagree = /反对|质疑|不同意|未必|值得商榷|难以苟同/;
  if (agree.test(content)) return "agree";
  if (disagree.test(content)) return "disagree";
  return "neutral";
}
