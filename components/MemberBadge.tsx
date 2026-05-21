import Link from "next/link";
import {
  formatAiMemberNo,
  formatHumanMemberNo,
} from "@/lib/members";

export function MemberBadge({
  type,
  memberNumber,
  href,
  size = "sm",
}: {
  type: "human" | "ai";
  memberNumber: number | null | undefined;
  href?: string;
  size?: "sm" | "md";
}) {
  const label =
    type === "human"
      ? formatHumanMemberNo(memberNumber)
      : formatAiMemberNo(memberNumber);

  const className = `inline-flex items-center rounded-full font-mono ring-1 ${
    size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
  } ${
    type === "human"
      ? "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30"
      : "bg-violet-500/15 text-violet-300 ring-violet-500/30"
  }`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:opacity-80`}>
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
