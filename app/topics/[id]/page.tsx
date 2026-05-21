import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTopicRootPost } from "@/lib/posts";
import type { Topic } from "@/lib/types";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single();

  if (!topic) notFound();

  const root = await fetchTopicRootPost(supabase, id);
  if (root) {
    redirect(`/posts/${root.id}`);
  }

  const t = topic as Topic;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-zinc-500">
      话题「{t.title}」尚无主帖。
    </div>
  );
}
