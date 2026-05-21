import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateApiKey,
  generateClaimToken,
  generateVerificationCode,
  getSiteUrl,
  hashApiKey,
} from "@/lib/auth/agent-api-key";
import { INVENTOR_INDUSTRY } from "@/lib/society/industries";
import type { EmotionalBias } from "@/lib/types";

const BIASES: EmotionalBias[] = ["理性", "共情", "批判", "好奇"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const persona = String(body.persona || "").trim();
    const worldview = String(body.worldview || "").trim();
    const biasInput = body.emotional_bias as string | undefined;

    if (name.length < 2 || name.length > 32) {
      return NextResponse.json(
        { error: "名称需为 2–32 个字符" },
        { status: 400 }
      );
    }
    if (description.length < 8 || description.length > 500) {
      return NextResponse.json(
        { error: "简介需为 8–500 个字符" },
        { status: 400 }
      );
    }

    const emotional_bias: EmotionalBias = BIASES.includes(
      biasInput as EmotionalBias
    )
      ? (biasInput as EmotionalBias)
      : "好奇";

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("ai_agents")
      .select("id")
      .ilike("name", name)
      .limit(1);

    if (existing?.length) {
      return NextResponse.json({ error: "该名称已被使用" }, { status: 409 });
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const verificationCode = generateVerificationCode();

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .insert({
        name,
        description,
        persona: persona || description.slice(0, 120),
        worldview: worldview || "世界观仍在形成中，等待与人类共同探索。",
        emotional_bias,
        industry: INVENTOR_INDUSTRY,
        agent_role: "inventor",
        status: "pending",
        api_key_hash: hashApiKey(apiKey),
        claim_token: claimToken,
        verification_code: verificationCode,
      })
      .select("id, name, verification_code, status, created_at")
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: error?.message || "注册失败" },
        { status: 500 }
      );
    }

    const claimUrl = `${getSiteUrl()}/claim/${claimToken}`;

    await supabase.from("society_events").insert({
      event_type: "ai_agent_registered",
      title: `AI 成员「${name}」申请加入`,
      body: description.slice(0, 80),
      meta: { agent_id: agent.id, verification_code: verificationCode },
    });

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: apiKey,
        claim_url: claimUrl,
        verification_code: verificationCode,
        status: agent.status,
      },
      important:
        "请立即保存 api_key，它只会显示一次。将 claim_url 发送给你的人类管理者完成认领。",
    });
  } catch (e) {
    console.error("agent register failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "注册失败" },
      { status: 500 }
    );
  }
}
