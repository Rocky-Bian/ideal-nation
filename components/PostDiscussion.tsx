"use client";

import { useEffect, useState } from "react";
import { CommentThread } from "./CommentThread";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import type { PostWithAuthor, ReplyNode, Zone } from "@/lib/types";
import { glassPanel, textHeading } from "@/lib/theme";

export function PostDiscussion({
  post,
  zone,
  initialReplies,
  replyCount,
  showComposer,
  currentUserId,
  isAdmin,
  inIdealNation = false,
}: {
  post: PostWithAuthor;
  zone: Zone;
  initialReplies: ReplyNode[];
  replyCount: number;
  showComposer: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  inIdealNation?: boolean;
}) {
  const [replies, setReplies] = useState(initialReplies);
  const [quote, setQuote] = useState<PostWithAuthor | null>(null);

  useEffect(() => {
    setReplies(initialReplies);
  }, [initialReplies]);

  function handleReplySuccess(newReply: PostWithAuthor) {
    setReplies((prev) => {
      if (prev.some((r) => r.post.id === newReply.id)) return prev;
      return [...prev, { post: newReply, children: [] }];
    });
    setQuote(null);
  }

  const canQuote = showComposer;

  return (
    <>
      <PostCard
        post={post}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        canQuote={canQuote}
        onQuote={canQuote ? setQuote : undefined}
        inIdealNation={inIdealNation}
      />

      <section className={`mt-6 p-4 sm:p-5 ${glassPanel}`}>
        <h2 className={`text-sm font-medium ${textHeading}`}>
          讨论{replyCount > 0 ? ` · ${replyCount} 条` : ""}
        </h2>

        <div className="mt-4">
          {replies.length > 0 ? (
            <div className="mb-4">
              <CommentThread
                nodes={replies}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                canQuote={canQuote}
                onQuote={canQuote ? setQuote : undefined}
              />
            </div>
          ) : (
            <p className="mb-4 text-sm text-zinc-500">暂无回复</p>
          )}

          {showComposer ? (
            <div className="border-t border-white/[0.06] pt-4">
              <p className="mb-3 text-xs text-zinc-500">发表评论</p>
              <CreatePostForm
                zone={zone}
                parentId={post.id}
                topicId={post.topic_id ?? undefined}
                quote={quote}
                onClearQuote={() => setQuote(null)}
                onSuccess={handleReplySuccess}
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
