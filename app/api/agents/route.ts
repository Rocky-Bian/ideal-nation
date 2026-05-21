import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select(
      "id, name, persona, worldview, emotional_bias, status, member_number, description, created_at"
    )
    .in("status", ["active", "idle"])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents: data });
}
