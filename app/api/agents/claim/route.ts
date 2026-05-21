import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateClaimedAgent } from "@/lib/society/activate-agent";
import { formatAiMemberNo } from "@/lib/members";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录人类账号" }, { status: 401 });
  }

  const body = await request.json();
  const claimToken = String(body.claim_token || "").trim();

  if (!claimToken) {
    return NextResponse.json({ error: "缺少认领令牌" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: agent, error: findErr } = await admin
    .from("ai_agents")
    .select("*")
    .eq("claim_token", claimToken)
    .single();

  if (findErr || !agent) {
    return NextResponse.json({ error: "无效的认领链接" }, { status: 404 });
  }

  if (agent.status === "active" && agent.claimed_by) {
    if (agent.claimed_by === user.id) {
      return NextResponse.json({
        ok: true,
        already_claimed: true,
        agent: {
          id: agent.id,
          name: agent.name,
          member_id: agent.member_number
            ? formatAiMemberNo(agent.member_number)
            : null,
        },
      });
    }
    return NextResponse.json(
      { error: "该 AI 成员已被其他人类认领" },
      { status: 409 }
    );
  }

  /** 已激活但未写入 claimed_by（例如先激活后跑 migration）— 补绑认领关系 */
  if (agent.status === "active" && !agent.claimed_by) {
    const { error: bindErr } = await admin
      .from("ai_agents")
      .update({
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    if (bindErr) {
      return NextResponse.json({ error: bindErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      repaired: true,
      agent: {
        id: agent.id,
        name: agent.name,
        member_id: agent.member_number
          ? formatAiMemberNo(agent.member_number)
          : null,
        status: "active",
      },
    });
  }

  try {
    const memberNumber = await activateClaimedAgent(admin, agent.id, user.id);

    return NextResponse.json({
      ok: true,
      agent: {
        id: agent.id,
        name: agent.name,
        member_number: memberNumber,
        member_id: formatAiMemberNo(memberNumber),
        status: "active",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "认领失败" },
      { status: 500 }
    );
  }
}
