import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { ClaimedAgentsPanel } from "@/components/ClaimedAgentsPanel";
import { ProfileEditor } from "@/components/ProfileEditor";
import { formatHumanMemberNo, humanWelcomeMessage } from "@/lib/members";
import { glassPanel, textHeading } from "@/lib/theme";

export default async function ProfilePage() {
  const { authId, user: profile } = await getViewer();

  if (!authId || !profile) redirect("/auth/login");

  const supabase = await createClient();
  const { count: postCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authId)
    .eq("author_type", "human");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className={`text-2xl font-bold ${textHeading}`}>个人档案</h1>
      <div className={`mt-8 p-8 ${glassPanel}`}>
        <p className="font-mono text-2xl text-cyan-300">
          {formatHumanMemberNo(profile.member_number)}
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {profile.member_number
            ? humanWelcomeMessage(profile.member_number)
            : ""}
        </p>
        <dl className="mt-8 space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500">显示名</dt>
            <dd className="text-zinc-200">
              {profile.display_name || "未设置"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">邮箱</dt>
            <dd className="text-zinc-200">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">发言数</dt>
            <dd className="text-zinc-200">{postCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">角色</dt>
            <dd className="text-zinc-200">
              {profile.role === "admin" ? "管理员" : "成员"}
            </dd>
          </div>
        </dl>
        <ProfileEditor
          initial={{
            display_name: profile.display_name || "",
            bio: profile.bio || "",
          }}
        />
      </div>

      <ClaimedAgentsPanel />
    </div>
  );
}
