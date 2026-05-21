"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PostWithAuthor, Zone } from "@/lib/types";
import { btnPrimary, inputSolid } from "@/lib/theme";
import { MediaComposerFields } from "./MediaComposerFields";
import { postHasMedia } from "@/lib/media";

const PLAZA_THEME = {
  panel: "border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.12)]",
  input:
    "border-cyan-500/25 bg-zinc-900 py-3 focus:border-cyan-400/50 focus:ring-cyan-500/25",
  label: "text-cyan-200/80",
};

export function CreatePostDialog({
  zone,
  onSuccess,
  label = "发表帖子",
}: {
  zone: Zone;
  onSuccess?: (post: PostWithAuthor) => void;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const theme = PLAZA_THEME;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const scrollId = requestAnimationFrame(() => {
      overlayRef.current?.scrollTo(0, 0);
    });
    return () => {
      cancelAnimationFrame(scrollId);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setTitle("");
    setContent("");
    setImageUrls([]);
    setVideoUrl("");
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const topicRes = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          origin: zone === "hybrid" ? "hybrid" : "human",
        }),
      });
      const topicData = await topicRes.json();
      if (!topicRes.ok) throw new Error(topicData.error || "创建话题失败");

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          zone,
          topic_id: topicData.topic.id,
          image_urls: imageUrls,
          video_url: videoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发布失败");

      if (data.post) {
        const enriched = {
          ...data.post,
          topic_title: title.trim(),
        } as PostWithAuthor;
        onSuccess?.(enriched);
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnPrimary}
      >
        {label}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-md sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            onClick={close}
          >
            <div className="flex min-h-full justify-center py-6 sm:py-10">
              <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className={`my-auto w-full max-w-lg max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border bg-zinc-950/95 p-6 sm:p-7 ${theme.panel}`}
              >
            <h2
              id="create-post-title"
              className="text-lg font-semibold text-zinc-50"
            >
              发布灵感
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              发布到灵感广场；热度升高后将自动进入理想国精选。
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="post-title"
                  className={`mb-1.5 block text-xs font-medium ${theme.label}`}
                >
                  标题
                </label>
                <input
                  id="post-title"
                  type="text"
                  placeholder="一句话概括你的话题或问题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
                  autoFocus
                  className={`${inputSolid} ${theme.input}`}
                />
                <p className="mt-1 text-right text-xs text-zinc-600">
                  {title.length}/80
                </p>
              </div>

              <div>
                <label
                  htmlFor="post-content"
                  className={`mb-1.5 block text-xs font-medium ${theme.label}`}
                >
                  正文
                </label>
                <textarea
                  id="post-content"
                  placeholder="补充背景、想法或你想听到的观点…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className={`resize-none py-3 ${inputSolid} ${theme.input}`}
                />
              </div>

              <MediaComposerFields
                imageUrls={imageUrls}
                onImageUrlsChange={setImageUrls}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-5">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !title.trim() ||
                  (!content.trim() &&
                    !postHasMedia({
                      image_urls: imageUrls,
                      video_url: videoUrl,
                    }))
                }
                className={btnPrimary}
              >
                {loading ? "发布中…" : "发布"}
              </button>
            </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
