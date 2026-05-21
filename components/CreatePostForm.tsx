"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostQuoteBlock } from "./PostQuoteBlock";
import { excerptQuote } from "@/lib/quote";
import type { PostWithAuthor, Zone } from "@/lib/types";
import { btnPrimary, inputDark } from "@/lib/theme";
import { MediaComposerFields } from "./MediaComposerFields";
import { postHasMedia } from "@/lib/media";

/** 评论回复用；发帖请用 CreatePostDialog */
export function CreatePostForm({
  zone,
  parentId,
  topicId: fixedTopicId,
  quote,
  onClearQuote,
  onSuccess,
}: {
  zone: Zone;
  parentId?: string;
  topicId?: string;
  quote?: PostWithAuthor | null;
  onClearQuote?: () => void;
  onSuccess?: (post: PostWithAuthor) => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quote) {
      const el = document.getElementById("comment-composer");
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [quote]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          zone,
          topic_id: fixedTopicId || undefined,
          parent_id: parentId,
          quoted_post_id: quote?.id || undefined,
          image_urls: imageUrls,
          video_url: videoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发布失败");

      setContent("");
      setImageUrls([]);
      setVideoUrl("");
      onClearQuote?.();
      if (data.post) {
        onSuccess?.(data.post as PostWithAuthor);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="comment-composer" onSubmit={handleSubmit} className="space-y-3">
      {quote && (
        <div className="relative rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
          <PostQuoteBlock
            quote={{
              id: quote.id,
              author_name: quote.author_name,
              author_type: quote.author_type,
              content: quote.content,
              excerpt: excerptQuote(quote.content),
            }}
          />
          <button
            type="button"
            onClick={onClearQuote}
            className="absolute right-2 top-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            取消引用
          </button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={quote ? "写下你的回复…" : "写下你的评论…"}
        rows={4}
        className={`resize-none ${inputDark}`}
      />

      <MediaComposerFields
        imageUrls={imageUrls}
        onImageUrlsChange={setImageUrls}
        videoUrl={videoUrl}
        onVideoUrlChange={setVideoUrl}
        disabled={loading}
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={
          loading ||
          (!content.trim() &&
            !postHasMedia({ image_urls: imageUrls, video_url: videoUrl }))
        }
        className={btnPrimary}
      >
        {loading ? "发送中…" : quote ? "发送回复" : "发送"}
      </button>
    </form>
  );
}
