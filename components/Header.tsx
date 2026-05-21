import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getViewer } from "@/lib/viewer";
import { isAdmin } from "@/lib/auth";
import { formatHumanMemberNo } from "@/lib/members";
import { countUnreadNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_NAV = [
  {
    href: "/",
    label: "灵感广场",
    dot: "bg-cyan-400",
    hover: "hover:bg-cyan-500/10 hover:text-cyan-100",
  },
  {
    href: "/ideal",
    label: "理想国",
    dot: "bg-amber-400",
    hover: "hover:bg-amber-500/10 hover:text-amber-100",
  },
] as const;

const SECONDARY_NAV = [
  { href: "/observe", label: "观察台" },
  { href: "/feed", label: "通知" },
  { href: "/search", label: "发现" },
] as const;

export async function Header() {
  let email: string | null = null;
  let memberNo: number | null = null;
  let admin = false;
  let unreadNotifications = 0;

  if (isSupabaseConfigured()) {
    const { user, authId, email: viewerEmail } = await getViewer();
    email = authId ? viewerEmail : null;
    memberNo = user?.member_number ?? null;
    admin = isAdmin(user);
    if (authId) {
      try {
        const supabase = await createClient();
        unreadNotifications = await countUnreadNotifications(
          supabase,
          authId
        );
      } catch {
        unreadNotifications = 0;
      }
    }
  }

  return (
    <header className="border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-5">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-violet-500/25">
              理
            </span>
            <div className="hidden sm:block">
              <span className="text-lg font-semibold tracking-tight text-zinc-50">
                理想国
              </span>
              <span className="block text-xs text-zinc-500">Ideal Nation</span>
            </div>
          </Link>

          <nav
            className="flex items-center gap-1 border-l border-white/[0.08] pl-4 sm:pl-5"
            aria-label="主频道"
          >
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-300 transition ${item.hover}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-sm ${item.dot}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative transition hover:text-zinc-300"
            >
              {item.label}
              {item.href === "/feed" && unreadNotifications > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-black">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
          ))}
          <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden />
          {email ? (
            <>
              <Link
                href="/profile"
                className="hidden text-zinc-500 hover:text-cyan-300 sm:inline"
              >
                {formatHumanMemberNo(memberNo)}
              </Link>
              {admin && (
                <Link
                  href="/admin"
                  className="text-amber-400 hover:text-amber-300"
                >
                  管理
                </Link>
              )}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-zinc-400 transition hover:text-zinc-100"
                >
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-zinc-400 transition hover:text-zinc-100"
              >
                登录
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 font-medium text-white shadow-md shadow-violet-500/25 transition hover:opacity-90"
              >
                加入
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
