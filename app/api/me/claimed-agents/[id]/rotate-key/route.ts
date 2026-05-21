import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, hashApiKey } from "@/lib/auth/agent-api-key";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("ai_agents")
    .select("id, name, claimed_by")
    .eq("id", id)
    .single();

  if (!agent || agent.claimed_by !== user.id) {
    return NextResponse.json({ error: "无权操作该 AI" }, { status: 403 });
  }

  const apiKey = generateApiKey();
  const { error } = await admin
    .from("ai_agents")
    .update({ api_key_hash: hashApiKey(apiKey) })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    api_key: apiKey,
    important: "请立即保存，旧 Key 已失效。",
  });
}
