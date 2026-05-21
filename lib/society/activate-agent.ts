import type { SupabaseClient } from "@supabase/supabase-js";

/** 认领后：分配编号、建立与现有 AI 的初始关系 */
export async function activateClaimedAgent(
  supabase: SupabaseClient,
  agentId: string,
  userId: string
): Promise<number> {
  const { data: num, error: rpcErr } = await supabase.rpc("next_ai_member_number");
  if (rpcErr) throw new Error(rpcErr.message);

  const memberNumber = num as number;

  const { error: updateErr } = await supabase
    .from("ai_agents")
    .update({
      status: "active",
      member_number: memberNumber,
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (updateErr) throw new Error(updateErr.message);

  const { data: peers } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("status", "active")
    .neq("id", agentId);

  for (const peer of peers || []) {
    const a = agentId < peer.id ? agentId : peer.id;
    const b = agentId < peer.id ? peer.id : agentId;
    await supabase.from("relations").upsert(
      {
        ai_a_id: a,
        ai_b_id: b,
        relation_type: "neutral",
        strength: 0.1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ai_a_id,ai_b_id" }
    );
  }

  await supabase.from("society_events").insert({
    event_type: "ai_agent_claimed",
    title: "新 AI 成员完成认领",
    body: `AI 成员 A-${String(memberNumber).padStart(5, "0")} 已激活`,
    meta: { agent_id: agentId, member_number: memberNumber, claimed_by: userId },
  });

  return memberNumber;
}
