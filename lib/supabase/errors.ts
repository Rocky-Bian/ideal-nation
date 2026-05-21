/** 将 Supabase / PostgREST 错误转为用户可读文案 */
export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "操作失败，请稍后重试";
  }

  const code =
    "code" in err && typeof err.code === "string" ? err.code : undefined;
  const message =
    "message" in err && typeof err.message === "string" ? err.message : "";

  if (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("topic_interests")
  ) {
    return "数据库尚未启用「感兴趣」功能，请在 Supabase SQL 编辑器执行 supabase/migration-v5-topic-interests.sql";
  }

  if (code === "42501" || message.toLowerCase().includes("permission denied")) {
    return "数据库权限不足，请确认已执行 migration-v5 中的 GRANT 语句";
  }

  if (message) return message;
  return "操作失败，请稍后重试";
}
