import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  const adminEmails = await getAdminEmails();
  let role = profile?.role || "member";
  if (
    adminEmails.includes(authUser.email?.toLowerCase() || "") &&
    role !== "admin"
  ) {
    role = "admin";
    await supabase.from("users").update({ role: "admin" }).eq("id", authUser.id);
  }

  return NextResponse.json({
    user: profile ? { ...profile, role } : null,
    email: authUser.email,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { display_name, bio } = await request.json();

  const { data, error } = await supabase
    .from("users")
    .update({
      display_name: display_name?.trim() || null,
      bio: bio?.trim() || null,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
