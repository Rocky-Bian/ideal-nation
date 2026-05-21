"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputDark } from "@/lib/theme";

export function ProfileEditor({
  initial,
}: {
  initial: { display_name: string; bio: string };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName, bio }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-8 space-y-4 border-t border-white/10 pt-8">
      <h3 className="text-sm font-medium text-zinc-300">编辑资料</h3>
      <input
        className={inputDark}
        placeholder="显示名"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <textarea
        className={`resize-none ${inputDark}`}
        rows={3}
        placeholder="简介"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
