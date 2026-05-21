import Link from "next/link";
import type { Zone } from "@/lib/types";
import { ZONE_DESCRIPTIONS, ZONE_LABELS } from "@/lib/zones";

const ZONE_BACK: Record<Zone, string> = {
  human: "/",
  ai: "/",
  hybrid: "/ideal",
  plaza: "/",
};

const ZONE_HEADER: Record<
  Zone,
  { shell: string; zoneLink: string; title: string; divider: string }
> = {
  plaza: {
    shell: "border-cyan-500/25 bg-cyan-500/[0.06] shadow-[0_0_24px_rgba(34,211,238,0.08)]",
    zoneLink: "text-cyan-300 hover:text-cyan-200",
    title: "text-cyan-50",
    divider: "text-cyan-500/40",
  },
  human: {
    shell: "border-cyan-500/25 bg-cyan-500/[0.06] shadow-[0_0_24px_rgba(34,211,238,0.08)]",
    zoneLink: "text-cyan-300 hover:text-cyan-200",
    title: "text-cyan-50",
    divider: "text-cyan-500/40",
  },
  ai: {
    shell: "border-violet-500/25 bg-violet-500/[0.06] shadow-[0_0_24px_rgba(139,92,246,0.08)]",
    zoneLink: "text-violet-300 hover:text-violet-200",
    title: "text-violet-50",
    divider: "text-violet-500/40",
  },
  hybrid: {
    shell: "border-amber-500/30 bg-amber-500/[0.08] shadow-[0_0_28px_rgba(245,158,11,0.1)]",
    zoneLink: "text-amber-300 hover:text-amber-200",
    title: "text-amber-50",
    divider: "text-amber-500/40",
  },
};

export function PostDetailHeader({
  zone,
  topicId,
  topicTitle,
  topicLink = false,
}: {
  zone: Zone;
  topicId?: string | null;
  topicTitle?: string | null;
  /** 理想国话题标题可点击跳转 */
  topicLink?: boolean;
}) {
  const styles = ZONE_HEADER[zone];
  const showTopic = topicId && topicTitle?.trim();

  return (
    <header
      className={`mb-6 rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${styles.shell}`}
    >
      <nav className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <Link
          href={ZONE_BACK[zone]}
          className={`font-medium transition ${styles.zoneLink}`}
        >
          ← {zone === "hybrid" ? ZONE_LABELS.hybrid : "灵感广场"}
        </Link>
        {showTopic && (
          <>
            <span className={styles.divider}>/</span>
            {topicLink ? (
              <Link
                href={`/topics/${topicId}`}
                className={`line-clamp-2 font-semibold leading-snug transition hover:opacity-90 ${styles.title}`}
              >
                {topicTitle}
              </Link>
            ) : (
              <span
                className={`line-clamp-2 font-semibold leading-snug ${styles.title}`}
              >
                {topicTitle}
              </span>
            )}
          </>
        )}
      </nav>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        {ZONE_DESCRIPTIONS[zone]}
      </p>
    </header>
  );
}
