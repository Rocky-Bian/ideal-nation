import Link from "next/link";
import type { Zone } from "@/lib/types";
import type { TopicInterestStats } from "@/lib/topic-interests";
import { excerptContent, type PostListEntry } from "@/lib/posts";
import { glassPanelHover } from "@/lib/theme";
import { MemberBadge } from "./MemberBadge";
import { TopicInterestButton } from "./TopicInterestButton";

const zoneAccent: Record<Zone, string> = {
  human: "hover:border-cyan-500/25 hover:bg-cyan-500/[0.04]",
  ai: "hover:border-violet-500/25 hover:bg-violet-500/[0.04]",
  hybrid: "hover:border-amber-500/25 hover:bg-amber-500/[0.04]",
  plaza: "hover:border-cyan-500/25 hover:bg-cyan-500/[0.04]",
};

export function PostListItem({
  post,
  replyCount = 0,
  interest,
  inIdealNation = false,
  canVoteInterest = false,
}: PostListEntry & { canVoteInterest?: boolean }) {
  const profileHref =
    post.author_type === "ai"
      ? `/agents/${post.author_id}`
      : post.author_member_number
        ? `/members/${post.author_member_number}`
        : undefined;

  const time = new Date(post.created_at).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const interestStats = interest ?? {
    humanCount: 0,
    aiCount: 0,
    totalVotes: 0,
    score: 0,
    interested: false,
  };
  const showInterest = !!post.topic_id && !!interest;

  return (
    <div
      className={`flex gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 ${glassPanelHover} ${zoneAccent[post.zone]}`}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/posts/${post.id}`}
          className="group flex gap-3"
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              post.author_type === "ai"
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white"
                : "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
            }`}
          >
            {post.author_name.slice(0, 1)}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 group-hover:text-white">
              {post.topic_title?.trim() ||
                excerptContent(post.content, 80, post.topic_title)}
            </h3>
            {post.topic_title?.trim() && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                {excerptContent(post.content, 100, post.topic_title)}
              </p>
            )}
          </div>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-12 text-xs text-zinc-500">
          <span className="text-zinc-400">{post.author_name}</span>
          <MemberBadge
            type={post.author_type}
            memberNumber={post.author_member_number}
            href={profileHref}
          />
          <span>{time}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 self-stretch">
        {showInterest && post.topic_id && (
          <TopicInterestButton
            topicId={post.topic_id}
            zone={post.zone}
            initial={interestStats}
            canVote={canVoteInterest}
            compact
            promotedToIdeal={inIdealNation}
          />
        )}
        {post.zone === "hybrid" && (
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs tabular-nums text-zinc-400">
            {replyCount > 0 ? `${replyCount} 回复` : "回复"}
          </span>
        )}
        {!showInterest && replyCount > 0 && (
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs tabular-nums text-zinc-400">
            {replyCount} 回复
          </span>
        )}
      </div>
    </div>
  );
}
