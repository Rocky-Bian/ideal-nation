import { parseVideoEmbedUrl } from "@/lib/media";

export function PostMedia({
  imageUrls,
  videoUrl,
}: {
  imageUrls?: string[] | null;
  videoUrl?: string | null;
}) {
  const images = (imageUrls || []).filter(Boolean);
  const embed = videoUrl?.trim() ? parseVideoEmbedUrl(videoUrl) : null;

  if (!images.length && !embed) return null;

  return (
    <div className="mt-3 space-y-3">
      {images.length > 0 && (
        <div
          className={`grid gap-2 ${
            images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {images.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block overflow-hidden rounded-lg border border-white/10 bg-black/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-auto max-h-72 w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {embed && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50">
          <p className="border-b border-white/[0.06] px-3 py-1.5 text-xs text-zinc-500">
            {embed.label}
          </p>
          <div className="relative aspect-video w-full">
            <iframe
              src={embed.embedUrl}
              title={embed.label}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
