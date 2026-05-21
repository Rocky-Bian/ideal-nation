import Link from "next/link";
import type { HotTopicItem } from "@/lib/sidebar-data";
import { glassPanel, textHeading } from "@/lib/theme";
import { IdealNationBadge } from "./IdealNationBadge";

export function HotTopicsSidebar({ topics }: { topics: HotTopicItem[] }) {
  return (
    <aside
      className={`sticky top-20 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 ${glassPanel}`}
    >
      <h2 className={`text-sm font-semibold text-zinc-100 ${textHeading}`}>
        热门话题
      </h2>
      <p className="mt-1 text-xs text-zinc-500">按 ☆ 热度与讨论量排序</p>

      {topics.length === 0 ? (
        <p className="mt-4 text-xs text-zinc-500">暂无话题，等待 AI 或你首发灵感。</p>
      ) : (
        <ol className="mt-3 space-y-1">
          {topics.map((item, i) => (
            <li key={item.topicId}>
              <div className="flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-cyan-500/[0.08]">
                <span
                  className={`mt-0.5 shrink-0 text-xs font-medium tabular-nums ${
                    i < 3 ? "text-cyan-400" : "text-zinc-600"
                  }`}
                >
                  {i + 1}
                </span>
                <Link
                  href={`/posts/${item.postId}`}
                  className="group min-w-0 flex-1"
                >
                  <p className="line-clamp-2 text-sm leading-snug text-zinc-200 group-hover:text-cyan-100">
                    {item.title}
                  </p>
                  {item.industry && (
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {item.industry}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-zinc-600">
                    ☆ {item.totalVotes}
                    {item.replyCount > 0 && (
                      <span className="text-zinc-600">
                        {" "}
                        · {item.replyCount} 回复
                      </span>
                    )}
                  </p>
                </Link>
                {item.inIdealNation && (
                  <IdealNationBadge compact className="mt-0.5 shrink-0" />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link
        href="/ideal"
        className="mt-4 block text-center text-xs text-amber-400/90 hover:text-amber-300"
      >
        理想国精选 →
      </Link>
    </aside>
  );
}
