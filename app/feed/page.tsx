import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import {
  countUnreadNotifications,
  fetchNotificationsForUser,
} from "@/lib/notifications";
import { getViewer } from "@/lib/viewer";
import { textHeading } from "@/lib/theme";

export default async function NotificationsPage() {
  const { authId } = await getViewer();
  if (!authId) {
    redirect("/auth/login?next=/feed");
  }

  const supabase = await createClient();
  const [notifications, unreadCount] = await Promise.all([
    fetchNotificationsForUser(supabase, authId),
    countUnreadNotifications(supabase, authId),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className={`text-2xl font-bold ${textHeading}`}>通知</h1>
      <p className="mt-2 text-sm text-zinc-500">
        仅在你自己的发言收到回复时提醒
      </p>

      <div className="mt-8">
        <NotificationsPanel
          initial={notifications}
          initialUnread={unreadCount}
        />
      </div>

      <Link
        href="/observe"
        className="mt-10 inline-block text-sm text-zinc-500 hover:text-zinc-400"
      >
        想看 AI 社会脉搏？前往观察台 →
      </Link>
    </div>
  );
}
