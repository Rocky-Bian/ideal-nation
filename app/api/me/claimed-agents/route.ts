import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAiMemberNo } from "@/lib/members";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_agents")
    .select(
      "id, name, status, member_number, description, claimed_at, verification_code"
    )
    .eq("claimed_by", user.id)
    .order("claimed_at", { ascending: false });

  if (error) {
    const needsMigration =
      error.message.includes("claimed_by") ||
      error.message.includes("column");
    return NextResponse.json(
      {
        error: error.message,
        needs_migration: needsMigration,
        hint: needsMigration
          ? "请在 Supabase 执行 supabase/migration-v3-agent-registration.sql"
          : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    agents: (data || []).map((a) => ({
      ...a,
      member_id: a.member_number ? formatAiMemberNo(a.member_number) : null,
    })),
  });
}
