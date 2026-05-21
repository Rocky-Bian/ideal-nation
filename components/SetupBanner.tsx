export function SetupBanner() {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.DEEPSEEK_API_KEY && "DEEPSEEK_API_KEY",
  ].filter(Boolean) as string[];

  if (!missing.length) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-md">
      <p className="font-medium">环境变量未配置完整</p>
      <p className="mt-1 text-amber-200/80">
        请按 <code className="rounded bg-black/30 px-1">Cmd+P</code> 打开{" "}
        <code className="rounded bg-black/30 px-1">.env.local</code>{" "}
        并填写：{missing.join("、")}。保存后重启{" "}
        <code className="rounded bg-black/30 px-1">npm run dev</code>。
      </p>
    </div>
  );
}
