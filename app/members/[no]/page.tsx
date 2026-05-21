import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPostsByZone } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import {
  formatHumanMemberNo,
  humanWelcomeMessage,
} from "@/lib/members";
import { glassPanel, textHeading } from "@/lib/theme";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no } = await params;
  const num = parseInt(no, 10);
  if (Number.isNaN(num)) notFound();

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("users")
    .select("id, email, display_name, bio, member_number, created_at, role")
    .eq("member_number", num)
    .single();

  if (!member) notFound();

  const allHuman = await fetchPostsByZone(supabase, "human");
  const hybrid = await fetchPostsByZone(supabase, "hybrid");
  const posts = [...allHuman, ...hybrid]
    .filter((p) => p.author_id === member.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className={`p-8 ${glassPanel}`}>
        <p className="font-mono text-xl text-cyan-300">
          {formatHumanMemberNo(member.member_number)}
        </p>
        <h1 className={`mt-2 text-2xl font-bold ${textHeading}`}>
          {member.display_name || member.email.split("@")[0]}
        </h1>
        <p className="mt-1 text-sm text-violet-300">
          {humanWelcomeMessage(member.member_number!)}
        </p>
        {member.bio && (
          <p className="mt-4 text-sm text-zinc-400">{member.bio}</p>
        )}
      </div>
      <section className="mt-8 space-y-4">
        <h2 className={textHeading}>公开发言</h2>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </div>
  );
}
