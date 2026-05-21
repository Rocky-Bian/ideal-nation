import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";
import { generateTopicTitle } from "../ai/client";
import { sanitizeTopicTitle } from "../ai/sanitize";
import {
  fetchRecentTitlesByAgent,
  isTitleTooSimilar,
} from "./agent-post-guard";
import {
  pickIndustryPostAngle,
  type IndustryPostAngle,
} from "./post-topic-types";

function normalizeTitle(title: string): string {
  return sanitizeTopicTitle(title).replace(/\s+/g, "").toLowerCase();
}

export async function fetchRecentTopicTitles(
  supabase: SupabaseClient,
  industry: string,
  limit = 25
): Promise<string[]> {
  const { data } = await supabase
    .from("topics")
    .select("title")
    .eq("industry", industry)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((t) => sanitizeTopicTitle(t.title as string)).filter(Boolean);
}

export async function isTopicTitleTaken(
  supabase: SupabaseClient,
  title: string,
  industry: string
): Promise<boolean> {
  const norm = normalizeTitle(title);
  if (!norm) return false;

  const { data } = await supabase
    .from("topics")
    .select("title")
    .eq("industry", industry)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).some(
    (t) => normalizeTitle(t.title as string) === norm
  );
}

/**
 * 生成不与本行业已有话题重复的标题（最多重试 3 次，仍冲突则加作者后缀）
 */
export async function generateUniqueTopicTitle(
  supabase: SupabaseClient,
  params: {
    agent: AiAgent;
    industry: string;
    memories: string;
    inventor?: boolean;
    postAngle?: IndustryPostAngle;
  }
): Promise<string> {
  const angle = params.inventor
    ? undefined
    : (params.postAngle ?? pickIndustryPostAngle().id);
  const [recentIndustry, recentByAgent] = await Promise.all([
    fetchRecentTopicTitles(supabase, params.industry),
    fetchRecentTitlesByAgent(supabase, params.agent.id, 8),
  ]);
  const forbidden = [...recentIndustry, ...recentByAgent];

  for (let attempt = 0; attempt < 5; attempt++) {
    const raw = await generateTopicTitle({
      agent: params.agent,
      industry: params.industry,
      memories: params.memories,
      recentTopics: forbidden.join("\n"),
      inventor: params.inventor,
      postAngle: angle,
    });

    const title = sanitizeTopicTitle(raw);
    if (!title) continue;

    if (isTitleTooSimilar(title, forbidden)) {
      forbidden.push(title);
      continue;
    }

    const taken = await isTopicTitleTaken(supabase, title, params.industry);
    if (!taken) return title;

    forbidden.push(title);
  }

  const fallbackBase =
    forbidden[forbidden.length - 1] ||
    `${params.industry}新视角`;
  const suffix = params.agent.name.slice(0, 4);
  let candidate = `${fallbackBase} · ${suffix}`;
  if (candidate.length > 80) candidate = candidate.slice(0, 80);
  if (await isTopicTitleTaken(supabase, candidate, params.industry)) {
    candidate = `${fallbackBase} · ${Date.now() % 10000}`;
  }
  return candidate;
}
