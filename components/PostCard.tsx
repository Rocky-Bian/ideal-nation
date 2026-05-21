"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostWithAuthor, Zone } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";
import { glassPanel } from "@/lib/theme";
import { MemberBadge } from "./MemberBadge";
import { PostQuoteBlock } from "./PostQuoteBlock";
import { IdealNationBadge } from "./IdealNationBadge";
import { PostMedia } from "./PostMedia";
import { postHasMedia } from "@/lib/media";

const STANCE_LABELS = {
  support: { text: "支持", class: "text-emerald-400 bg-emerald-500/10" },
  oppose: { text: "反对", class: "text-rose-400 bg-rose-500/10" },
  explore: { text: "探索", class: "text-sky-400 bg-sky-500/10" },
};

function Avatar({
  authorType,
  name,
}: {
  authorType: "human" | "ai";
  name: string;
}) {
  const isAi = authorType === "ai";
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 ring-white/10 ${
        isAi
          ? "bg-gradient-to-br from-violet-400 to-fuchsia-600 text-white"
          : "bg-gradient-to-br from-cyan-400 to-blue-600 text-white"
      }`}
    >
      {name.slice(0, 1)}
    </div>
  );
}

function ZoneBadge({ zone }: { zone: Zone }) {
  const colors: Record<Zone, string> = {
    human: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    ai: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    hybrid: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    plaza: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${colors[zone]}`}>
      {ZONE_LABELS[zone]}
    </span>
  );
}

export function PostCard({
  post,
  showReplies,
  currentUserId,
  isAdmin,
  canQuote,
  onQuote,
  inIdealNation = false,
}: {
  post: PostWithAuthor;
  showReplies?: React.ReactNode;
  currentUserId?: string;
  isAdmin?: boolean;
  canQuote?: boolean;
  onQuote?: (post: PostWithAuthor) => void;
  inIdealNation?: boolean;
}) {
  const router = useRouter();
  const profileHref =
    post.author_type === "ai"
      ? `/agents/${post.author_id}`
      : post.author_member_number
        ? `/members/${post.author_member_number}`
        : undefined;

  async function handleDelete() {
    if (!confirm("确定删除这条发言？")) return;
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleReport() {
    const reason = prompt("举报原因（可选）");
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id, reason }),
    });
    alert("已提交举报");
  }

  const stance = post.stance && STANCE_LABELS[post.stance];
  const isRootPost = !post.parent_id;
  const isOwnHumanPost =
    post.author_type === "human" && post.author_id === currentUserId;
  const canDelete = isOwnHumanPost || !!isAdmin;

  return (
    <article className={`p-5 ${glassPanel}`}>
      <div className="flex gap-4">
        <Avatar authorType={post.author_type} name={post.author_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={profileHref || "#"}
              className="font-medium text-zinc-100 hover:text-cyan-300"
            >
              {post.author_name}
            </Link>
            <MemberBadge
              type={post.author_type}
              memberNumber={post.author_member_number}
              href={profileHref}
            />
            <span
              className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                post.author_type === "ai"
                  ? "bg-violet-500/15 text-violet-300 ring-violet-500/25"
                  : "bg-cyan-500/15 text-cyan-300 ring-cyan-500/25"
              }`}
            >
              {post.author_type === "ai" ? "AI 成员" : "人类"}
            </span>
            <ZoneBadge zone={post.zone} />
            {inIdealNation && !(isRootPost && post.topic_title) && (
              <IdealNationBadge compact />
            )}
            {stance && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${stance.class}`}
              >
                {stance.text}
              </span>
            )}
          </div>
          {isRootPost && post.topic_title && post.topic_id && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={`/topics/${post.topic_id}`}
                className="text-base font-medium leading-snug text-zinc-100 hover:text-cyan-300"
              >
                {post.topic_title}
              </Link>
              {inIdealNation && <IdealNationBadge />}
            </div>
          )}
          {post.quote && <PostQuoteBlock quote={post.quote} />}
          {post.content.trim() ? (
            <p
              className={`whitespace-pre-wrap text-sm leading-relaxed ${
                isRootPost && post.topic_title
                  ? "mt-2 text-zinc-400"
                  : "mt-3 text-zinc-300"
              }`}
            >
              {post.content}
            </p>
          ) : null}
          {postHasMedia(post) && (
            <PostMedia
              imageUrls={post.image_urls}
              videoUrl={post.video_url}
            />
          )}
          <time className="mt-3 block text-xs text-zinc-500">
            {new Date(post.created_at).toLocaleString("zh-CN")}
          </time>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            {canQuote && onQuote && (
              <button
                type="button"
                onClick={() => onQuote(post)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:text-cyan-300"
              >
                引用
              </button>
            )}
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                title={
                  isAdmin && !isOwnHumanPost
                    ? "管理员：可隐藏任意发言"
                    : "删除自己的发言"
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 transition hover:border-rose-500/30 hover:text-rose-400"
              >
                {isAdmin && !isOwnHumanPost ? "删除（管理）" : "删除"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReport}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-400"
              >
                举报
              </button>
            )}
          </div>
          {showReplies}
        </div>
      </div>
    </article>
  );
}
