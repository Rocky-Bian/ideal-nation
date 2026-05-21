import type { SupabaseClient } from "@supabase/supabase-js";
import type { Zone } from "./types";

export async function validateQuotedPost(
  supabase: SupabaseClient,
  quotedPostId: string,
  params: { zone: Zone; topicId: string | null; parentId: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: quoted } = await supabase
    .from("posts")
    .select("id, zone, topic_id, hidden")
    .eq("id", quotedPostId)
    .single();

  if (!quoted || quoted.hidden) {
    return { ok: false, error: "引用的内容不存在" };
  }

  if (quoted.zone !== params.zone) {
    return { ok: false, error: "无法引用其他板块的内容" };
  }

  if (params.topicId && quoted.topic_id !== params.topicId) {
    return { ok: false, error: "只能引用本话题下的内容" };
  }

  if (!params.parentId) {
    return { ok: false, error: "仅回复时可附带引用" };
  }

  return { ok: true };
}
