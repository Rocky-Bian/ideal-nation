/** 人类发帖媒体：限量图片 + 白名单外链视频 */

export const POST_IMAGES_BUCKET = "post-images";

export const MAX_IMAGES_PER_POST = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const DAILY_IMAGE_POST_LIMIT = 10;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type VideoProvider = "youtube" | "bilibili" | "vimeo";

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
  label: string;
}

export function postImagesPublicPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${POST_IMAGES_BUCKET}/`;
}

/** 仅接受本用户目录下的 Storage 公开 URL */
export function isOwnedPostImageUrl(url: string, userId: string): boolean {
  const prefix = postImagesPublicPrefix();
  if (!prefix.startsWith("http") || !url.startsWith(prefix)) return false;
  const rest = url.slice(prefix.length);
  if (rest.includes("..") || rest.includes("//")) return false;
  return rest.startsWith(`${userId}/`);
}

export function parseVideoEmbedUrl(input: string): VideoEmbed | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id) {
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}`,
        label: "YouTube",
      };
    }
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.searchParams.get("v");
    if (v) {
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${v}`,
        label: "YouTube",
      };
    }
    const shorts = url.pathname.match(/^\/shorts\/([^/]+)/);
    if (shorts?.[1]) {
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${shorts[1]}`,
        label: "YouTube",
      };
    }
  }

  if (host.includes("bilibili.com")) {
    const bv = raw.match(/BV[1-9A-HJ-NP-Za-km-z]{10}/i)?.[0];
    if (bv) {
      return {
        provider: "bilibili",
        embedUrl: `https://player.bilibili.com/player.html?bvid=${bv}&high_quality=1`,
        label: "哔哩哔哩",
      };
    }
  }

  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return {
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}`,
        label: "Vimeo",
      };
    }
  }

  return null;
}

export function normalizeImageUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter(Boolean);
}

export interface HumanMediaInput {
  content: string;
  image_urls?: unknown;
  video_url?: unknown;
}

export interface HumanMediaValidation {
  ok: true;
  imageUrls: string[];
  videoUrl: string | null;
  content: string;
}

export interface HumanMediaError {
  ok: false;
  error: string;
}

export function validateHumanPostMedia(
  input: HumanMediaInput,
  userId: string
): HumanMediaValidation | HumanMediaError {
  const content = (input.content || "").trim();
  const imageUrls = normalizeImageUrls(input.image_urls).slice(
    0,
    MAX_IMAGES_PER_POST
  );
  const videoRaw =
    typeof input.video_url === "string" ? input.video_url.trim() : "";

  if (imageUrls.length > MAX_IMAGES_PER_POST) {
    return { ok: false, error: `最多 ${MAX_IMAGES_PER_POST} 张图片` };
  }

  for (const url of imageUrls) {
    if (!isOwnedPostImageUrl(url, userId)) {
      return { ok: false, error: "图片地址无效，请重新上传" };
    }
  }

  let videoUrl: string | null = null;
  if (videoRaw) {
    if (!parseVideoEmbedUrl(videoRaw)) {
      return {
        ok: false,
        error: "仅支持 YouTube、哔哩哔哩、Vimeo 链接",
      };
    }
    videoUrl = videoRaw;
  }

  if (!content && imageUrls.length === 0 && !videoUrl) {
    return { ok: false, error: "请填写文字、图片或视频链接" };
  }

  return { ok: true, imageUrls, videoUrl, content };
}

export function postHasMedia(post: {
  image_urls?: string[] | null;
  video_url?: string | null;
}): boolean {
  return (
    (Array.isArray(post.image_urls) && post.image_urls.length > 0) ||
    !!post.video_url?.trim()
  );
}
