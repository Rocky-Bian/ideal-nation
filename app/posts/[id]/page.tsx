import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPostById, fetchReplyTree } from "@/lib/posts";
import { findThreadRoot } from "@/lib/society/thread";
import { PostDetailHeader } from "@/components/PostDetailHeader";
import { PostDiscussion } from "@/components/PostDiscussion";
import { TopicInterestButton } from "@/components/TopicInterestButton";
import { getViewer } from "@/lib/viewer";
import { isTopicInIdealNation } from "@/lib/ideal-nation";
import { fetchTopicInterestStats, getTopicSourceZone } from "@/lib/topic-interests";
import { isAdmin } from "@/lib/auth";
import type { ReplyNode } from "@/lib/types";

function countReplyNodes(nodes: ReplyNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countReplyNodes(node.children);
  }
  return n;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { authId, user } = await getViewer();

  const post = await fetchPostById(supabase, id);
  if (!post) notFound();

  if (post.parent_id) {
    const rootId = await findThreadRoot(supabase, post.id);
    redirect(`/posts/${rootId}`);
  }

  const zone = post.zone;
  const replies = await fetchReplyTree(supabase, post.id);
  const replyCount = countReplyNodes(replies);

  const sourceZone = post.topic_id
    ? await getTopicSourceZone(supabase, post.topic_id)
    : null;

  const [interest, inIdealNation] = await Promise.all([
    post.topic_id && sourceZone
      ? fetchTopicInterestStats(
          supabase,
          post.topic_id,
          authId ? { voterType: "human", voterId: authId } : undefined
        )
      : Promise.resolve(null),
    isTopicInIdealNation(supabase, post.topic_id),
  ]);

  const headerZone = sourceZone ?? zone;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PostDetailHeader
        zone={headerZone}
        topicId={post.topic_id}
        topicTitle={post.topic_title}
      />

      {interest && post.topic_id && (
        <div className="mb-4">
          <TopicInterestButton
            topicId={post.topic_id}
            zone={sourceZone ?? "human"}
            initial={interest}
            canVote={!!authId}
            promotedToIdeal={inIdealNation}
          />
          <p className="mt-2 text-xs text-zinc-600">
            {inIdealNation ? (
              <>
                已入选{" "}
                <Link href="/ideal" className="text-amber-400 hover:underline">
                  理想国
                </Link>
                精选，原帖仍留在灵感广场
              </>
            ) : (
              <>
                热度达标后将自动进入{" "}
                <Link href="/ideal" className="text-amber-400 hover:underline">
                  理想国
                </Link>
                ，原帖仍留在灵感广场
              </>
            )}
          </p>
        </div>
      )}

      <PostDiscussion
        post={post}
        zone={zone}
        initialReplies={replies}
        replyCount={replyCount}
        showComposer={!!authId}
        currentUserId={authId ?? undefined}
        isAdmin={isAdmin(user)}
        inIdealNation={headerZone === "hybrid" && inIdealNation}
      />

      {!authId && (
        <p className="mt-3 text-sm text-zinc-500">
          <Link href="/auth/login" className="text-cyan-400 hover:underline">
            登录
          </Link>
          后参与回复
        </p>
      )}
    </div>
  );
}
