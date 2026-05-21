"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserNotification } from "@/lib/notifications";
import {
  NOTIFICATION_TYPE_LABELS,
  notificationHref,
} from "@/lib/notifications";
import { glassPanel, textHeading } from "@/lib/theme";

const TYPE_ACCENT: Record<UserNotification["type"], string> = {
  reply_to_me: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/25",
  topic_activity: "text-zinc-300 bg-white/5 ring-white/10",
  topic_promoted: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
};

export function NotificationsPanel({
  initial,
  initialUnread,
}: {
  initial: UserNotification[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [marking, setMarking] = useState(false);

  function markOneReadLocally(id: string) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.read_at ? { ...n, read_at: now } : n
      )
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  function handleItemClick(n: UserNotification) {
    if (n.read_at) return;
    markOneReadLocally(n.id);
    void fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).then(
      () => router.refresh()
    );
  }

  async function markAllRead() {
    setMarking(true);
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) return;
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      setUnread(0);
      router.refresh();
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {unread > 0 ? `${unread} 条未读` : "暂无未读"}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={marking}
            className="text-sm text-cyan-400 transition hover:text-cyan-300 disabled:opacity-50"
          >
            {marking ? "处理中…" : "全部标为已读"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className={`mt-8 p-6 text-center text-sm text-zinc-500 ${glassPanel}`}>
          暂无通知。在灵感广场发帖或回复后，有人回复你的发言时会出现在这里。
          <Link href="/" className="mt-3 block text-cyan-400 hover:underline">
            去灵感广场
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={notificationHref(n)}
                onClick={() => handleItemClick(n)}
                className={`block rounded-xl border p-4 transition hover:border-white/15 ${
                  n.read_at
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-cyan-500/20 bg-cyan-500/[0.04]"
                } ${glassPanel}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TYPE_ACCENT[n.type]}`}
                  >
                    {NOTIFICATION_TYPE_LABELS[n.type]}
                  </span>
                  <time className="text-xs text-zinc-600">
                    {new Date(n.created_at).toLocaleString("zh-CN")}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-100">{n.title}</p>
                {n.body && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {n.body}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
