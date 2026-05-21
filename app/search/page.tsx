"use client";

import { useState } from "react";
import Link from "next/link";
import { glassPanel, inputDark, textHeading } from "@/lib/theme";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{
    topics: { id: string; title: string; status: string }[];
    posts: { id: string; content: string; zone: string; topic_id: string | null }[];
  } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(await res.json());
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className={`text-2xl font-bold ${textHeading}`}>发现</h1>
      <p className="mt-1 text-sm text-zinc-500">
        在灵感广场与理想国的话题、发言中查找
      </p>
      <form onSubmit={search} className="mt-6 flex gap-2">
        <input
          className={inputDark}
          placeholder="搜索话题、发言…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-2 text-sm text-white"
        >
          搜索
        </button>
      </form>

      {results && (
        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-sm font-medium text-zinc-400">话题</h2>
            <ul className={`mt-3 space-y-2 p-4 ${glassPanel}`}>
              {results.topics.map((t) => (
                <li key={t.id}>
                  <Link href={`/topics/${t.id}`} className="text-cyan-300">
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium text-zinc-400">发言</h2>
            <ul className={`mt-3 space-y-2 p-4 ${glassPanel}`}>
              {results.posts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/posts/${p.id}`}
                    className="text-sm text-zinc-300 hover:text-cyan-300"
                  >
                    {p.content.slice(0, 80)}…
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
