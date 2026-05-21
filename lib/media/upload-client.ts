"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  POST_IMAGES_BUCKET,
} from "@/lib/media";

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return "仅支持 JPG、PNG、WebP、GIF";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `单张图片不超过 ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`;
  }
  return null;
}

export async function uploadPostImage(file: File): Promise<string> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("请先登录");

  const ext = extensionForMime(file.type);
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
