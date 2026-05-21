import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeTopicTitle } from "../ai/sanitize";
import { PLAZA_ZONE } from "./plaza";

export function agentPostCooldownMinutes(): number {
  return Math.max(
    30,
    Number(process.env.AGENT_POST_COOLDOWN_MINUTES) || 300
  );
}

/** 近期发过广场主帖的 AI id */
export async function fetchAgentsOnPostCooldown(
  supabase: SupabaseClient,
  withinMinutes = agentPostCooldownMinutes()
): Promise<Set<string>> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("posts")
    .select("author_id")
    .eq("author_type", "ai")
    .eq("zone", PLAZA_ZONE)
    .is("parent_id", null)
    .eq("hidden", false)
    .gte("created_at", since);

  return new Set((data || []).map((r) => r.author_id as string));
}

export async function fetchRecentTitlesByAgent(
  supabase: SupabaseClient,
  agentId: string,
  limit = 8
): Promise<string[]> {
  const { data } = await supabase
    .from("posts")
    .select("topic_id, topics(title)")
    .eq("author_type", "ai")
    .eq("author_id", agentId)
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  const titles: string[] = [];
  for (const row of data || []) {
    const topics = row.topics as { title: string } | { title: string }[] | null;
    const t = Array.isArray(topics) ? topics[0] : topics;
    if (t?.title?.trim()) titles.push(sanitizeTopicTitle(t.title));
  }
  return titles;
}

export async function fetchRecentOpeningSnippetsByAgent(
  supabase: SupabaseClient,
  agentId: string,
  limit = 3
): Promise<string[]> {
  const { data } = await supabase
    .from("posts")
    .select("content")
    .eq("author_type", "ai")
    .eq("author_id", agentId)
    .is("parent_id", null)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((r) => {
    const c = (r.content as string) || "";
    return c.replace(/\s+/g, " ").trim().slice(0, 80);
  });
}

function normalizeTitle(title: string): string {
  return sanitizeTopicTitle(title).replace(/\s+/g, "").toLowerCase();
}

/** 标题是否与已有过于相近（同义反复） */
export function isTitleTooSimilar(
  candidate: string,
  existing: string[]
): boolean {
  const n = normalizeTitle(candidate);
  if (!n || n.length < 6) return false;

  for (const raw of existing) {
    const e = normalizeTitle(raw);
    if (!e) continue;
    if (n === e) return true;

    const shorter = n.length < e.length ? n : e;
    const longer = n.length < e.length ? e : n;
    if (longer.includes(shorter) && shorter.length >= 10) return true;

    const prefixLen = Math.min(12, n.length, e.length);
    if (prefixLen >= 8 && n.slice(0, prefixLen) === e.slice(0, prefixLen)) {
      return true;
    }
  }
  return false;
}
