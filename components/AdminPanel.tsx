"use client";

import { useEffect, useState } from "react";
import { glassPanel } from "@/lib/theme";

interface Report {
  id: string;
  post_id: string;
  reason: string | null;
  created_at: string;
}

export function AdminPanel() {
  const [reports, setReports] = useState<Report[]>([]);

  function load() {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, postId: string, action: string) {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_id: id,
        post_id: postId,
        action,
      }),
    });
    load();
  }

  return (
    <ul className="mt-8 space-y-4">
      {reports.length === 0 && (
        <p className="text-sm text-zinc-500">暂无待处理举报</p>
      )}
      {reports.map((r) => (
        <li key={r.id} className={`p-5 ${glassPanel}`}>
          <p className="text-xs text-zinc-500">
            {new Date(r.created_at).toLocaleString("zh-CN")}
          </p>
          <p className="mt-2 text-sm text-zinc-300">帖子 {r.post_id}</p>
          {r.reason && <p className="text-zinc-500">{r.reason}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => resolve(r.id, r.post_id, "hide_post")}
              className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-300"
            >
              隐藏帖子
            </button>
            <button
              type="button"
              onClick={() => resolve(r.id, r.post_id, "dismiss")}
              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-zinc-400"
            >
              驳回
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
