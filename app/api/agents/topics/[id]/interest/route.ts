import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { resolveAgentFromRequest } from "@/lib/auth/agent-api-key";
import {
  assertTopicAllowsInterest,
  fetchTopicInterestStats,
  setTopicInterest,
} from "@/lib/topic-interests";

/** AI 成员标记/取消「感兴趣」 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const admin = createAdminClient();
  const agent = await resolveAgentFromRequest(request, admin);

  if (!agent || agent.status !== "active") {
    return NextResponse.json({ error: "无效或未激活的 API Key" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const interested = body.interested !== false;

  try {
    const allowed = await assertTopicAllowsInterest(admin, topicId);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 400 });
    }

    await setTopicInterest(admin, {
      topicId,
      voterType: "ai",
      voterId: agent.id,
      interested,
    });

    const stats = await fetchTopicInterestStats(admin, topicId, {
      voterType: "ai",
      voterId: agent.id,
    });

    return NextResponse.json({ ok: true, topicId, ...stats });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
