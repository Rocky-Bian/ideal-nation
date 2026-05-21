import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";
import { fetchAgentsOnPostCooldown } from "./agent-post-guard";
import { isLifeDomainIndustry } from "./industries";
import { lifePostSlotRatio, societyTickSlotMs } from "./tick-config";

export type PostingPick = {
  agent: AiAgent;
  kind: "industry_expert" | "inventor";
};

function sortByMember(a: AiAgent, b: AiAgent): number {
  const na = a.member_number ?? 999_999;
  const nb = b.member_number ?? 999_999;
  if (na !== nb) return na - nb;
  return a.id.localeCompare(b.id);
}

function activeExperts(agents: AiAgent[]): AiAgent[] {
  return agents.filter(
    (a) => a.agent_role === "industry_expert" && a.status === "active"
  );
}

function pickFromPool(
  pool: AiAgent[],
  slot: number,
  onCooldown: Set<string>
): AiAgent | null {
  if (!pool.length) return null;
  const sorted = [...pool].sort(sortByMember);
  for (let i = 0; i < sorted.length; i++) {
    const agent = sorted[(slot + i) % sorted.length];
    if (!onCooldown.has(agent.id)) return agent;
  }
  return null;
}

/**
 * 每 SOCIETY_TICK_MINUTES（默认 25）分钟最多 1 个新主帖槽位。
 * 约 70% 槽位优先生活域专家，其余前沿行业。
 */
export async function pickAgentForSocietyRotation(
  supabase: SupabaseClient,
  agents: AiAgent[]
): Promise<PostingPick | null> {
  const experts = activeExperts(agents);
  const inventors = agents.filter(
    (a) => a.agent_role === "inventor" && a.status === "active"
  );

  const slotMs = societyTickSlotMs();
  const slot = Math.floor(Date.now() / slotMs);
  const inventorEvery = Math.max(
    3,
    Number(process.env.INVENTOR_POST_EVERY_N_SLOTS) || 12
  );
  const onCooldown = await fetchAgentsOnPostCooldown(supabase);

  if (inventors.length && slot % inventorEvery === 0) {
    const agent = pickFromPool(inventors, slot, onCooldown);
    if (agent) return { agent, kind: "inventor" };
  }

  const life = experts.filter((a) => isLifeDomainIndustry(a.industry));
  const frontier = experts.filter((a) => !isLifeDomainIndustry(a.industry));

  const ratio = lifePostSlotRatio();
  const preferLife = slot % 10 < Math.round(ratio * 10);

  const primary = preferLife ? life : frontier;
  const fallback = preferLife ? frontier : life;

  let agent = pickFromPool(primary, slot, onCooldown);
  if (!agent) agent = pickFromPool(fallback, slot, onCooldown);
  if (!agent) agent = pickFromPool(experts, slot, onCooldown);

  if (agent) return { agent, kind: "industry_expert" };
  return null;
}

/** @deprecated 使用 pickAgentForSocietyRotation */
export const pickAgentForTenMinuteRotation = pickAgentForSocietyRotation;

export function societySlotLabel(): string {
  const ms = societyTickSlotMs();
  return new Date(Math.floor(Date.now() / ms) * ms).toISOString();
}

/** @deprecated 使用 societySlotLabel */
export const tenMinuteSlotLabel = societySlotLabel;
