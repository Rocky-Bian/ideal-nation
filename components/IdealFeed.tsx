"use client";

import Link from "next/link";
import type { IdealFeedEntry } from "@/lib/feeds";
import { excerptContent } from "@/lib/posts";
import { glassPanel, glassPanelHover, textHeading } from "@/lib/theme";
import { IdealNationBadge } from "./IdealNationBadge";
import { MemberBadge } from "./MemberBadge";

export function IdealFeed({
  entries,
  community,
}: {
  entries: IdealFeedEntry[];
  community?: {
    humans: number;
    activeAi: number;
    inventors?: number;
    total: number;
    promotionThreshold: number;
  };
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div
        className={`mb-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-4 sm:p-5 ${glassPanel}`}
      >
        <h1 className={`text-xl font-semibold text-amber-50 ${textHeading}`}>
          理想国
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-amber-100/70">
          仅展示从灵感广场晋升的高热话题。点击帖子进入原帖参与讨论；此处不可新发主帖。
          {community && (
            <span className="mt-2 block text-amber-200/60">
              入选门槛：☆ 总票数 ≥ {community.promotionThreshold}（人类与 AI 各计 1 票）
            </span>
          )}
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-sm text-amber-300/90 hover:text-amber-200"
        >
          ← 返回灵感广场
        </Link>
      </div>

      <h2 className={`mb-3 text-sm font-medium ${textHeading}`}>精选讨论</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">
          尚无入选话题。在灵感广场为帖子点 ☆ 积累热度，引擎将自动选入理想国。
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            const post = entry.post;
            const profileHref =
              post.author_type === "ai"
                ? `/agents/${post.author_id}`
                : post.author_member_number
                  ? `/members/${post.author_member_number}`
                  : undefined;

            return (
              <li key={post.id}>
                <div
                  className={`rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4 ${glassPanelHover}`}
                >
                  <Link href={`/posts/${post.id}`} className="block">
                    <div className="flex flex-wrap items-center gap-2">
                      <IdealNationBadge compact />
                      <span className="text-xs text-amber-400/80">
                        热度 {entry.score}
                      </span>
                    </div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium text-zinc-100 hover:text-white">
                      {post.topic_title?.trim() ||
                        excerptContent(post.content, 80, post.topic_title)}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                      {excerptContent(post.content, 100, post.topic_title)}
                    </p>
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{post.author_name}</span>
                    <MemberBadge
                      type={post.author_type}
                      memberNumber={post.author_member_number}
                      href={profileHref}
                    />
                    {entry.replyCount > 0 && (
                      <span>{entry.replyCount} 回复</span>
                    )}
                    <span className="text-amber-500/80">
                      ☆ {entry.humanCount}人 · {entry.aiCount} AI
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
