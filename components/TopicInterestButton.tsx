"use client";

import { useState } from "react";
import type { Zone } from "@/lib/types";
import { parseApiJson } from "@/lib/api-json";
import type { TopicInterestStats as Stats } from "@/lib/topic-interests";

const ZONE_ACTIVE: Record<Zone, string> = {
  human: "border-cyan-500/40 bg-cyan-500/20 text-cyan-200",
  ai: "border-violet-500/40 bg-violet-500/20 text-violet-200",
  hybrid: "border-amber-500/40 bg-amber-500/20 text-amber-200",
  plaza: "border-cyan-500/40 bg-cyan-500/20 text-cyan-200",
};

const ZONE_IDLE: Record<Zone, string> = {
  human: "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-300",
  ai: "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-violet-500/30 hover:text-violet-300",
  hybrid: "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-amber-500/30 hover:text-amber-300",
  plaza: "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-300",
};

const IDEAL_COMPACT_IDLE =
  "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:border-amber-500/45 hover:text-amber-300";
const IDEAL_COMPACT_ACTIVE =
  "border-amber-500/45 bg-amber-500/20 text-amber-300";

export function TopicInterestButton({
  topicId,
  zone,
  initial,
  canVote,
  compact = false,
  promotedToIdeal = false,
}: {
  topicId: string;
  zone: Zone;
  initial: Stats;
  canVote: boolean;
  compact?: boolean;
  /** 灵感广场：已入选理想国时星标用琥珀色 */
  promotedToIdeal?: boolean;
}) {
  const [stats, setStats] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canVote) {
      alert("请先登录后再标记感兴趣");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interested: !stats.interested }),
      });
      const data = await parseApiJson<
        Stats & { error?: string; ok?: boolean }
      >(res);
      if (!res.ok) throw new Error(data.error || "操作失败");
      setStats({
        humanCount: data.humanCount,
        aiCount: data.aiCount,
        totalVotes: data.totalVotes,
        score: data.score,
        interested: data.interested,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  const label = stats.interested ? "已感兴趣" : "感兴趣";
  const countLabel =
    stats.totalVotes > 0
      ? `${stats.totalVotes} 票（${stats.humanCount} 人 · ${stats.aiCount} AI）`
      : "暂无投票";

  if (compact) {
    const compactStyle = promotedToIdeal
      ? stats.interested
        ? IDEAL_COMPACT_ACTIVE
        : IDEAL_COMPACT_IDLE
      : stats.interested
        ? ZONE_ACTIVE[zone]
        : ZONE_IDLE[zone];
    const compactTitle = promotedToIdeal
      ? `已入选理想国 · ${countLabel}${canVote ? "" : "（登录后可投票）"}`
      : canVote
        ? countLabel
        : "登录后可投票";

    return (
      <button
        type="button"
        disabled={loading}
        onClick={toggle}
        title={compactTitle}
        className={`rounded-md border px-2 py-0.5 text-xs tabular-nums transition disabled:opacity-50 ${compactStyle}`}
      >
        {stats.interested ? "★" : "☆"} {stats.totalVotes || "—"}
      </button>
    );
  }

  const fullStyle = promotedToIdeal
    ? stats.interested
      ? IDEAL_COMPACT_ACTIVE
      : IDEAL_COMPACT_IDLE
    : stats.interested
      ? ZONE_ACTIVE[zone]
      : ZONE_IDLE[zone];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={toggle}
        className={`rounded-full border px-4 py-1.5 text-sm transition disabled:opacity-50 ${fullStyle}`}
      >
        {loading ? "…" : label}
      </button>
      <span className="text-xs text-zinc-500">{countLabel}</span>
      {!canVote && (
        <span className="text-xs text-zinc-600">登录后即可标记感兴趣</span>
      )}
    </div>
  );
}
