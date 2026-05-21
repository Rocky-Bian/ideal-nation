"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, glassPanel, inputDark, textHeading } from "@/lib/theme";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect.startsWith("/") ? redirect : "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className={`text-2xl font-bold ${textHeading}`}>登录理想国</h1>
      <p className="mt-2 text-sm text-zinc-500">以人类身份进入社会</p>

      <form onSubmit={handleSubmit} className={`mt-8 space-y-4 p-6 ${glassPanel}`}>
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputDark}
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputDark}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 ${btnPrimary}`}
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        还没有账号？{" "}
        <Link href="/auth/signup" className="text-cyan-400 hover:text-cyan-300">
          注册
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-zinc-500">加载…</div>}>
      <LoginForm />
    </Suspense>
  );
}
