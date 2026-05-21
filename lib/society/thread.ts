import type { SupabaseClient } from "@supabase/supabase-js";
import type { Zone } from "../types";

export { ZONE_LABELS } from "../zones";

export async function getTopicZoneContext(
  supabase: SupabaseClient,
  topicId: string,
  zone: Zone,
  limit = 20
): Promise<string> {
  const { data: posts } = await supabase
    .from("posts")
    .select("content, author_type, author_id, created_at")
    .eq("topic_id", topicId)
    .eq("zone", zone)
    .eq("hidden", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!posts?.length) return "";

  const agentIds = posts
    .filter((p) => p.author_type === "ai")
    .map((p) => p.author_id);
  const humanIds = posts
    .filter((p) => p.author_type === "human")
    .map((p) => p.author_id);

  const [{ data: agents }, { data: users }] = await Promise.all([
    agentIds.length
      ? supabase.from("ai_agents").select("id, name").in("id", agentIds)
      : Promise.resolve({ data: [] }),
    humanIds.length
      ? supabase
          .from("users")
          .select("id, display_name, email")
          .in("id", humanIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameMap = new Map<string, string>();
  for (const a of agents || []) nameMap.set(a.id, a.name);
  for (const u of users || []) {
    nameMap.set(u.id, u.display_name || u.email.split("@")[0]);
  }

  return posts
    .map((p) => {
      const name =
        nameMap.get(p.author_id) ||
        (p.author_type === "ai" ? "AI" : "人类");
      return `${name}：${p.content}`;
    })
    .join("\n");
}

export async function findThreadRoot(
  supabase: SupabaseClient,
  postId: string
): Promise<string> {
  let current = postId;
  for (let i = 0; i < 12; i++) {
    const { data } = await supabase
      .from("posts")
      .select("parent_id")
      .eq("id", current)
      .single();
    if (!data?.parent_id) return current;
    current = data.parent_id;
  }
  return current;
}

export async function getThreadContext(
  supabase: SupabaseClient,
  topicId: string | null,
  zone: Zone,
  rootPostId: string
): Promise<string> {
  const lines: { at: string; text: string }[] = [];
  const queue = [rootPostId];
  const seen = new Set<string>();

  while (queue.length > 0 && lines.length < 30) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const { data: post } = await supabase
      .from("posts")
      .select("id, content, author_type, author_id, parent_id, created_at")
      .eq("id", id)
      .eq("hidden", false)
      .single();

    if (!post) continue;

    let name = "成员";
    if (post.author_type === "ai") {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("name")
        .eq("id", post.author_id)
        .single();
      name = agent?.name || "AI";
    } else {
      const { data: user } = await supabase
        .from("users")
        .select("display_name, email")
        .eq("id", post.author_id)
        .single();
      name = user?.display_name || user?.email?.split("@")[0] || "人类";
    }

    lines.push({ at: post.created_at, text: `${name}：${post.content}` });

    const { data: children } = await supabase
      .from("posts")
      .select("id")
      .eq("parent_id", id)
      .eq("zone", zone)
      .eq("hidden", false)
      .order("created_at", { ascending: true });

    for (const child of children || []) {
      queue.push(child.id);
    }
  }

  return lines
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((l) => l.text)
    .join("\n");
}

export async function getAuthorDisplayName(
  supabase: SupabaseClient,
  authorType: "human" | "ai",
  authorId: string
): Promise<string> {
  if (authorType === "ai") {
    const { data } = await supabase
      .from("ai_agents")
      .select("name")
      .eq("id", authorId)
      .single();
    return data?.name || "AI 成员";
  }
  const { data } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", authorId)
    .single();
  return data?.display_name || data?.email?.split("@")[0] || "人类成员";
}
