import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(profile)) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ reports: data || [] });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { report_id, action, post_id } = await request.json();
  const admin = createAdminClient();

  if (action === "hide_post" && post_id) {
    await admin.from("posts").update({ hidden: true }).eq("id", post_id);
  }

  if (report_id) {
    await admin
      .from("reports")
      .update({ status: action === "dismiss" ? "dismissed" : "resolved" })
      .eq("id", report_id);
  }

  return NextResponse.json({ ok: true });
}
