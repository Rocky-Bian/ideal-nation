import type { SupabaseClient } from "@supabase/supabase-js";

/** 话题已晋升理想国：存在未隐藏的 hybrid 区主帖 */
export async function fetchPromotedTopicIdSet(
  supabase: SupabaseClient,
  topicIds: string[]
): Promise<Set<string>> {
  const unique = [...new Set(topicIds.filter(Boolean))];
  if (!unique.length) return new Set();

  const { data, error } = await supabase
    .from("posts")
    .select("topic_id")
    .in("topic_id", unique)
    .eq("zone", "hybrid")
    .is("parent_id", null)
    .eq("hidden", false);

  if (error) throw error;

  return new Set(
    (data || [])
      .map((r) => r.topic_id as string)
      .filter(Boolean)
  );
}

/** 所有已晋升话题（不依赖当前列表是否包含该 topic） */
export async function fetchAllPromotedTopicIdSet(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("posts")
    .select("topic_id")
    .eq("zone", "hybrid")
    .is("parent_id", null)
    .eq("hidden", false)
    .not("topic_id", "is", null);

  if (error) throw error;

  return new Set(
    (data || [])
      .map((r) => r.topic_id as string)
      .filter(Boolean)
  );
}

export async function isTopicInIdealNation(
  supabase: SupabaseClient,
  topicId: string | null | undefined
): Promise<boolean> {
  if (!topicId) return false;
  const set = await fetchPromotedTopicIdSet(supabase, [topicId]);
  return set.has(topicId);
}
