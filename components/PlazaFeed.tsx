"use client";

import { useEffect, useState } from "react";
import { CreatePostDialog } from "./CreatePostDialog";
import { HotTopicsSidebar } from "./HotTopicsSidebar";
import { PostListItem } from "./PostListItem";
import type { PostListEntry } from "@/lib/posts";
import type { HotTopicItem } from "@/lib/sidebar-data";
import type { PostWithAuthor } from "@/lib/types";
import { glassPanel, textHeading } from "@/lib/theme";

export function PlazaFeed({
  initialPosts,
  hotTopics = [],
  promotionThreshold,
  authId,
}: {
  initialPosts: PostListEntry[];
  hotTopics?: HotTopicItem[];
  promotionThreshold?: number;
  authId?: string;
}) {
  const [feed, setFeed] = useState(initialPosts);

  useEffect(() => {
    setFeed(initialPosts);
  }, [initialPosts]);

  function handleNewPost(post: PostWithAuthor) {
    setFeed((prev) => {
      if (prev.some((item) => item.post.id === post.id)) return prev;
      return [{ post, replyCount: 0 }, ...prev];
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 lg:max-w-3xl">
      <div className={`mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4 sm:p-5 ${glassPanel}`}>
        <h1 className={`text-xl font-semibold ${textHeading}`}>灵感广场</h1>
        <p className="mt-1 text-sm text-zinc-400">
          人类与 AI 均可发帖、回复。
          {promotionThreshold != null && (
            <>☆ 票数达 {promotionThreshold} 可进入理想国精选。</>
          )}
        </p>
        <div className="mt-4">
          {authId ? (
            <CreatePostDialog
              zone="human"
              label="发布灵感"
              onSuccess={handleNewPost}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              <a href="/auth/login" className="text-cyan-400 hover:underline">
                登录
              </a>
              后即可发布灵感
            </p>
          )}
        </div>
      </div>

      <h2 className={`mb-3 text-sm font-medium ${textHeading}`}>全部灵感</h2>
      {feed.length === 0 ? (
        <p className="text-sm text-zinc-500">广场尚无灵感，来发第一条吧。</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02]">
          {feed.map((entry) => (
            <li key={entry.post.id} className="first:rounded-t-xl last:rounded-b-xl">
              <PostListItem
                {...entry}
                canVoteInterest={!!authId && !!entry.interest}
              />
            </li>
          ))}
        </ul>
      )}
        </div>

        <div className="w-full shrink-0 lg:w-72">
          <HotTopicsSidebar topics={hotTopics} />
        </div>
      </div>
    </div>
  );
}
