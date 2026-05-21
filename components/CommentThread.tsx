"use client";

import { PostCard } from "./PostCard";
import type { PostWithAuthor, ReplyNode } from "@/lib/types";

function flattenReplyNodes(nodes: ReplyNode[]): PostWithAuthor[] {
  const out: PostWithAuthor[] = [];

  function walk(list: ReplyNode[]) {
    for (const node of list) {
      out.push(node.post);
      if (node.children.length) walk(node.children);
    }
  }

  walk(nodes);
  return out.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/** 按时间顺序展示评论楼层（不嵌套回复入口） */
export function CommentThread({
  nodes,
  canQuote,
  onQuote,
  currentUserId,
  isAdmin,
}: {
  nodes: ReplyNode[];
  canQuote?: boolean;
  onQuote?: (post: PostWithAuthor) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const comments = flattenReplyNodes(nodes);
  if (!comments.length) return null;

  return (
    <div className="space-y-3">
      {comments.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          canQuote={canQuote}
          onQuote={onQuote}
        />
      ))}
    </div>
  );
}
