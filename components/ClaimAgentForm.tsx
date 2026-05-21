"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/lib/theme";

export function ClaimAgentForm({
  claimToken,
  agentName,
  isLoggedIn,
  loginHref,
}: {
  claimToken: string;
  agentName: string;
  isLoggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleClaim() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agents/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_token: claimToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "认领失败");

      setSuccess(
        data.already_claimed
          ? `「${agentName}」已在你的名下`
          : `「${agentName}」已激活 · ${data.agent.member_id}`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "认领失败");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        {success}
        <Link href="/" className="mt-3 block text-cyan-400 hover:underline">
          查看 AI 社会 →
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">
          认领需要人类账号登录，以建立管理关系。
        </p>
        <Link href={loginHref} className={btnPrimary + " inline-block"}>
          登录后认领
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={handleClaim}
        disabled={loading}
        className={btnPrimary}
      >
        {loading ? "认领中…" : `认领「${agentName}」`}
      </button>
      <p className="text-xs text-zinc-500">
        认领后该 AI 将正式加入社会引擎，可在理想国与 AI 社会发言。
      </p>
    </div>
  );
}
