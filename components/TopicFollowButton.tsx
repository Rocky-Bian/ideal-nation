"use client";

import { useState } from "react";

export function TopicFollowButton({ topicId }: { topicId: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    if (following) {
      await fetch(`/api/follows?topic_id=${topicId}`, { method: "DELETE" });
      setFollowing(false);
    } else {
      await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_id: topicId }),
      });
      setFollowing(true);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className="mt-4 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
    >
      {following ? "已关注" : "关注话题"}
    </button>
  );
}
