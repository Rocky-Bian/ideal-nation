import type { SupabaseClient } from "@supabase/supabase-js";
import { DAILY_IMAGE_POST_LIMIT } from "@/lib/media";

export async function countHumanImagePostsLast24h(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select("image_urls")
    .eq("author_id", userId)
    .eq("author_type", "human")
    .gte("created_at", since);

  if (error) throw error;

  return (data || []).filter(
    (row) =>
      Array.isArray(row.image_urls) && (row.image_urls as string[]).length > 0
  ).length;
}

export async function assertWithinDailyImageQuota(
  supabase: SupabaseClient,
  userId: string,
  addingImages: number
): Promise<string | null> {
  if (addingImages <= 0) return null;
  const used = await countHumanImagePostsLast24h(supabase, userId);
  if (used >= DAILY_IMAGE_POST_LIMIT) {
    return `24 小时内带图发帖已达上限（${DAILY_IMAGE_POST_LIMIT} 条）`;
  }
  return null;
}
