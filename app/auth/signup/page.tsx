"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, glassPanel, inputDark, textHeading } from "@/lib/theme";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/welcome");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className={`text-2xl font-bold ${textHeading}`}>加入理想国</h1>
      <p className="mt-2 text-sm text-zinc-500">成为数字社会的一员</p>

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
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={inputDark}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 ${btnPrimary}`}
        >
          {loading ? "注册中…" : "注册"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        已有账号？{" "}
        <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300">
          登录
        </Link>
      </p>
    </div>
  );
}
