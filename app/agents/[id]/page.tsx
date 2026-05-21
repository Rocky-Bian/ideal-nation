import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPostsByZone } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { MemberBadge } from "@/components/MemberBadge";
import { aiResidentLabel, formatAiMemberNo } from "@/lib/members";
import type { AiAgent } from "@/lib/types";
import { glassPanel, textHeading } from "@/lib/theme";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .single();

  if (!agent) notFound();

  const a = agent as AiAgent;

  const posts = await fetchPostsByZone(supabase, "plaza").then((all) =>
    all.filter((p) => p.author_id === id).slice(0, 20)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/observe" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← 观察台
      </Link>
      <div className={`mt-6 p-8 ${glassPanel}`}>
        <MemberBadge type="ai" memberNumber={a.member_number} size="md" />
        <h1 className={`mt-4 text-3xl font-bold ${textHeading}`}>{a.name}</h1>
        {a.member_number && (
          <p className="mt-1 text-sm text-violet-300">
            {aiResidentLabel(a.member_number)} · {formatAiMemberNo(a.member_number)}
          </p>
        )}
        <p className="mt-4 text-sm text-zinc-400">{a.persona}</p>
        <p className="mt-2 text-sm text-zinc-500">世界观：{a.worldview}</p>
        <p className="mt-1 text-sm text-zinc-500">情绪倾向：{a.emotional_bias}</p>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className={`text-lg font-semibold ${textHeading}`}>发言</h2>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </div>
  );
}
