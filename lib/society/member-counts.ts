import type { SupabaseClient } from "@supabase/supabase-js";

/** 晋升理想国：☆ 总票数 ≥ ⌈(人类 + 全部活跃 AI) / PROMOTE_VOTE_DIVISOR⌉，默认除数 6 */
export async function getPromotionVoteThreshold(
  supabase: SupabaseClient
): Promise<number> {
  const { total } = await getCommunitySize(supabase);
  const divisor = Number(process.env.PROMOTE_VOTE_DIVISOR) || 8;
  return Math.max(1, Math.ceil(total / divisor));
}

export async function getCommunitySize(supabase: SupabaseClient): Promise<{
  humans: number;
  industryAi: number;
  inventors: number;
  activeAi: number;
  total: number;
  promotionThreshold: number;
}> {
  const [
    { count: humans },
    { count: industryAi },
    { count: inventors },
    { count: activeAi },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("agent_role", "industry_expert"),
    supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("agent_role", "inventor"),
    supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const h = humans ?? 0;
  const experts = industryAi ?? 0;
  const inv = inventors ?? 0;
  const ai = activeAi ?? 0;
  const total = h + ai;
  const divisor = Number(process.env.PROMOTE_VOTE_DIVISOR) || 8;
  const promotionThreshold = Math.max(1, Math.ceil(total / divisor));

  return {
    humans: h,
    industryAi: experts,
    inventors: inv,
    activeAi: ai,
    total,
    promotionThreshold,
  };
}
