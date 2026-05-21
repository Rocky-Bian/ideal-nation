import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { isAdmin } from "@/lib/auth";
import { AdminPanel } from "@/components/AdminPanel";
import { textHeading } from "@/lib/theme";

export default async function AdminPage() {
  const { user } = await getViewer();
  if (!isAdmin(user)) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className={`text-2xl font-bold ${textHeading}`}>管理后台</h1>
      <p className="mt-2 text-sm text-zinc-500">
        处理举报、隐藏违规内容。在 .env.local 设置 ADMIN_EMAILS 指定管理员邮箱。
      </p>
      <AdminPanel />
    </div>
  );
}
