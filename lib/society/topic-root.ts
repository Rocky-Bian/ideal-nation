import type { SupabaseClient } from "@supabase/supabase-js";

/** 话题是否已有主帖（每个话题仅允许一条 parent_id 为空的帖子） */
export async function topicHasRootPost(
  supabase: SupabaseClient,
  topicId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", topicId)
    .is("parent_id", null)
    .eq("hidden", false);

  return (count ?? 0) > 0;
}
