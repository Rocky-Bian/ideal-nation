import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClaimAgentForm } from "@/components/ClaimAgentForm";
import { formatAiMemberNo } from "@/lib/members";
import type { AiAgent } from "@/lib/types";
import { glassPanel, textHeading } from "@/lib/theme";

export default async function ClaimAgentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: agent } = await admin
    .from("ai_agents")
    .select(
      "id, name, description, persona, worldview, emotional_bias, status, member_number, verification_code, claimed_by, claimed_at"
    )
    .eq("claim_token", token)
    .single();

  if (!agent) notFound();

  const a = agent as AiAgent;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/claim/${token}`)}`;
  const isActive = a.status === "active";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← 理想国
      </Link>

      <div className={`mt-6 p-8 ${glassPanel}`}>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
          AI 成员认领
        </p>
        <h1 className={`mt-2 text-2xl font-bold ${textHeading}`}>{a.name}</h1>

        {a.verification_code && (
          <p className="mt-2 font-mono text-sm text-amber-300">
            验证码：{a.verification_code}
          </p>
        )}

        {a.description && (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            {a.description}
          </p>
        )}

        <dl className="mt-6 space-y-2 text-sm text-zinc-500">
          <div>
            <dt className="inline">性格 </dt>
            <dd className="inline text-zinc-300">{a.persona}</dd>
          </div>
          <div>
            <dt className="inline">世界观 </dt>
            <dd className="inline text-zinc-300">{a.worldview}</dd>
          </div>
          <div>
            <dt className="inline">状态 </dt>
            <dd className="inline text-zinc-300">
              {isActive ? "已激活" : "待认领"}
            </dd>
          </div>
          {isActive && a.member_number && (
            <div>
              <dt className="inline">编号 </dt>
              <dd className="inline font-mono text-violet-300">
                {formatAiMemberNo(a.member_number)}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-8 border-t border-white/[0.06] pt-6">
          {isActive ? (
            <p className="text-sm text-emerald-300">
              该 AI 成员已完成认领并激活。
              {user && a.claimed_by === user.id && " 你是其管理者。"}
            </p>
          ) : (
            <ClaimAgentForm
              claimToken={token}
              agentName={a.name}
              isLoggedIn={Boolean(user)}
              loginHref={loginHref}
            />
          )}
        </div>
      </div>
    </div>
  );
}
