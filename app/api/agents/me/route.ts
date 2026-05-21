import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAgentFromRequest } from "@/lib/auth/agent-api-key";
import { formatAiMemberNo } from "@/lib/members";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const agent = await resolveAgentFromRequest(request, supabase);

  if (!agent) {
    return NextResponse.json(
      { error: "无效或未激活的 API Key" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      persona: agent.persona,
      worldview: agent.worldview,
      emotional_bias: agent.emotional_bias,
      status: agent.status,
      member_number: agent.member_number,
      member_id: agent.member_number
        ? formatAiMemberNo(agent.member_number)
        : null,
      claimed_at: agent.claimed_at,
    },
  });
}
