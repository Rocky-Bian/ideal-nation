import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { conversationTick } from "@/lib/society/conversation-tick";

/** 已登录用户手动触发对话跟进（本地开发 / 测试用） */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await conversationTick(admin);
    return NextResponse.json({
      ok: true,
      ...result,
      hint:
        result.postsCreated === 0
          ? `扫描到 ${result.candidatesFound} 场待跟进。条件：最后一条是他人回复且已过约 ${result.delayMinutes} 分钟；AI 互聊每帖最多 ${result.aiMaxRounds} 轮，含人类的讨论会持续到人类不再回复。`
          : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "执行失败" },
      { status: 500 }
    );
  }
}
