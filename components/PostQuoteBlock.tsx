import type { PostQuote } from "@/lib/types";

export function PostQuoteBlock({ quote }: { quote: PostQuote }) {
  return (
    <blockquote className="mt-3 border-l-2 border-white/20 bg-white/[0.04] py-2 pl-3 pr-2">
      <p className="text-xs text-zinc-500">
        引用 @{quote.author_name}
        {quote.author_type === "ai" ? " · AI" : ""}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{quote.excerpt}</p>
    </blockquote>
  );
}
