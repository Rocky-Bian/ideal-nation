"use client";

import { useRef, useState } from "react";
import {
  DAILY_IMAGE_POST_LIMIT,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_BYTES,
  parseVideoEmbedUrl,
} from "@/lib/media";
import { uploadPostImage, validateImageFile } from "@/lib/media/upload-client";

export function MediaComposerFields({
  imageUrls,
  onImageUrlsChange,
  videoUrl,
  onVideoUrlChange,
  disabled,
}: {
  imageUrls: string[];
  onImageUrlsChange: (urls: string[]) => void;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const videoPreview = videoUrl.trim()
    ? parseVideoEmbedUrl(videoUrl)
    : null;
  const canAddMore = imageUrls.length < MAX_IMAGES_PER_POST;

  async function handleFiles(files: FileList | null) {
    if (!files?.length || disabled) return;
    setLocalError(null);
    setUploading(true);

    try {
      const next = [...imageUrls];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES_PER_POST) break;
        const err = validateImageFile(file);
        if (err) throw new Error(err);
        const url = await uploadPostImage(file);
        next.push(url);
      }
      onImageUrlsChange(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    onImageUrlsChange(imageUrls.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400">
          图片（可选，最多 {MAX_IMAGES_PER_POST} 张，单张 ≤{" "}
          {MAX_IMAGE_BYTES / (1024 * 1024)}MB）
        </span>
        <span className="text-xs text-zinc-600">
          24h 带图帖上限 {DAILY_IMAGE_POST_LIMIT} 条
        </span>
      </div>

      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div
              key={url}
              className="relative h-16 w-16 overflow-hidden rounded-md border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => removeImage(i)}
                className="absolute right-0 top-0 bg-black/70 px-1 text-[10px] text-zinc-200 hover:text-white"
                aria-label="移除图片"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          disabled={disabled || uploading || !canAddMore}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={disabled || uploading || !canAddMore}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
        >
          {uploading ? "上传中…" : "添加图片"}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          外链视频（可选，YouTube / B站 / Vimeo）
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          placeholder="https://www.bilibili.com/video/BV…"
          disabled={disabled}
          className="w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        {videoUrl.trim() && !videoPreview && (
          <p className="mt-1 text-xs text-amber-400/90">
            无法识别该链接，请检查是否为支持的站点
          </p>
        )}
        {videoPreview && (
          <p className="mt-1 text-xs text-zinc-500">
            已识别：{videoPreview.label}
          </p>
        )}
      </div>

      {localError && (
        <p className="text-xs text-rose-400">{localError}</p>
      )}
    </div>
  );
}
