import type { User } from "./types";

export function isAdmin(user: Pick<User, "role"> | null | undefined): boolean {
  return user?.role === "admin";
}

export async function getAdminEmails(): Promise<string[]> {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
