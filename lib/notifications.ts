import type { SupabaseClient } from "@supabase/supabase-js";
import { findThreadRoot } from "@/lib/society/thread";
import type { AuthorType } from "@/lib/types";

export type NotificationType =
  | "reply_to_me"
  | "topic_activity"
  | "topic_promoted";

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  post_id: string | null;
  topic_id: string | null;
  read_at: string | null;
  created_at: string;
}

type InsertRow = {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  post_id?: string | null;
  topic_id?: string | null;
};

async function resolveAuthorName(
  supabase: SupabaseClient,
  authorType: AuthorType,
  authorId: string
): Promise<string> {
  if (authorType === "ai") {
    const { data } = await supabase
      .from("ai_agents")
      .select("name")
      .eq("id", authorId)
      .maybeSingle();
    return data?.name || "AI 成员";
  }
  const { data } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", authorId)
    .maybeSingle();
  return data?.display_name || data?.email?.split("@")[0] || "人类成员";
}

async function insertNotifications(
  supabase: SupabaseClient,
  rows: InsertRow[]
): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error) console.error("user_notifications insert failed:", error.message);
}

/** 新回复：仅通知被直接回复的人类作者 */
export async function dispatchPostNotifications(
  supabase: SupabaseClient,
  params: {
    postId: string;
    topicId: string | null;
    parentId: string | null;
    authorType: AuthorType;
    authorId: string;
    topicTitle?: string | null;
  }
): Promise<void> {
  const { postId, topicId, parentId, authorType, authorId, topicTitle } =
    params;

  const actorName = await resolveAuthorName(supabase, authorType, authorId);
  const linkPostId = await findThreadRoot(supabase, postId);
  const rows: InsertRow[] = [];

  if (parentId) {
    const { data: parent } = await supabase
      .from("posts")
      .select("author_type, author_id, topic_id")
      .eq("id", parentId)
      .maybeSingle();

    if (
      parent?.author_type === "human" &&
      parent.author_id !== authorId
    ) {
      const title =
        topicTitle?.trim() ?
          `「${actorName}」回复了你在「${topicTitle.trim()}」中的发言`
        : `「${actorName}」回复了你的发言`;

      rows.push({
        user_id: parent.author_id as string,
        type: "reply_to_me",
        title,
        body: null,
        post_id: linkPostId,
        topic_id: (parent.topic_id as string) || topicId,
      });
    }
  }

  await insertNotifications(supabase, rows);
}

export async function fetchNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserNotification[];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export function notificationHref(n: UserNotification): string {
  if (n.post_id) return `/posts/${n.post_id}`;
  if (n.topic_id) return `/topics/${n.topic_id}`;
  return "/";
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  reply_to_me: "回复了我",
  topic_activity: "话题动态",
  topic_promoted: "理想国",
};
