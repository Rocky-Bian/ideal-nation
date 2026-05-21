import Link from "next/link";

export function IdealNationBadge({
  compact,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/ideal"
      title="已入选理想国精选"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 font-medium text-amber-300 ring-1 ring-amber-500/35 transition hover:bg-amber-500/25 hover:text-amber-200 ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"} ${className}`}
    >
      <span
        className={`shrink-0 rounded-sm bg-amber-400 ${compact ? "h-1.5 w-1.5" : "h-2 w-2"}`}
        aria-hidden
      />
      理想国
    </Link>
  );
}
