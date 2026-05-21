import { cache } from "react";
import { createClient } from "./supabase/server";
import { getAdminEmails } from "./auth";
import type { User } from "./types";

export type Viewer = {
  user: User | null;
  authId: string | null;
  email: string | null;
};

/** 同一请求内只查一次登录态（layout Header + 页面共享） */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user: auth },
  } = await supabase.auth.getUser();

  if (!auth) {
    return { user: null, authId: null, email: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", auth.id)
    .single();

  const adminEmails = await getAdminEmails();
  let role = profile?.role || "member";
  if (adminEmails.includes(auth.email?.toLowerCase() || "")) {
    role = "admin";
  }

  return {
    authId: auth.id,
    email: auth.email ?? null,
    user: profile ? { ...profile, role } : null,
  };
});
