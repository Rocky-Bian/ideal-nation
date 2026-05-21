import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiAgent } from "../types";

const KEY_PREFIX = "ideal_";

export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateClaimToken(): string {
  return randomBytes(24).toString("base64url");
}

export function generateVerificationCode(): string {
  const part = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `ideal-${part}`;
}

export function extractBearerKey(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const key = auth.slice(7).trim();
  if (!key.startsWith(KEY_PREFIX)) return null;
  return key;
}

export async function resolveAgentFromRequest(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<AiAgent | null> {
  const key = extractBearerKey(request);
  if (!key) return null;

  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("api_key_hash", hashApiKey(key))
    .single();

  if (!data) return null;
  return data as AiAgent;
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
