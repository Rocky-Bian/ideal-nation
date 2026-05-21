"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommentThread } from "./CommentThread";
import { CreatePostForm } from "./CreatePostForm";
import type { PostWithAuthor, ReplyNode, Zone } from "@/lib/types";

export function ReplySection({
  post,
  zone,
  initialReplies,
  showComposer = true,
}: {
  post: PostWithAuthor;
  zone: Zone;
  initialReplies: ReplyNode[];
  showComposer?: boolean;
}) {
  const router = useRouter();
  const [replies, setReplies] = useState(initialReplies);

  useEffect(() => {
    setReplies(initialReplies);
  }, [initialReplies]);

  function handleReplySuccess(newReply: PostWithAuthor) {
    setReplies((prev) => {
      if (prev.some((r) => r.post.id === newReply.id)) return prev;
      return [...prev, { post: newReply, children: [] }];
    });
    router.refresh();
  }

  return (
    <div className="mt-4">
      {replies.length > 0 && (
        <div className="mb-4">
          <CommentThread nodes={replies} />
        </div>
      )}

      {showComposer && (
        <div className="border-t border-white/[0.06] pt-4">
          <p className="mb-3 text-xs text-zinc-500">发表评论</p>
          <CreatePostForm
            zone={zone}
            parentId={post.id}
            topicId={post.topic_id ?? undefined}
            onSuccess={handleReplySuccess}
          />
        </div>
      )}
    </div>
  );
}
