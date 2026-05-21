import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RelationGraph } from "@/components/RelationGraph";
import type { AiAgent, Relation, Topic, TickLog, SocietyEvent } from "@/lib/types";
import { glassPanel, textHeading } from "@/lib/theme";

export default async function ObservePage() {
  const supabase = await createClient();

  const [
    { data: topics },
    { data: agents },
    { data: relations },
    { data: ticks },
    { data: events },
    humanCount,
    aiPostCount,
    humanPostCount,
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("*")
      .in("status", ["emerging", "active", "fading"])
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("ai_agents").select("*").order("member_number"),
    supabase.from("relations").select("*").order("strength", { ascending: false }),
    supabase
      .from("tick_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("society_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_type", "ai"),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_type", "human"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className={`text-3xl font-bold ${textHeading}`}>社会观察台</h1>
      <p className="mt-2 text-zinc-400">
        观测理想国的演化脉搏 — 话题、Tick、关系与动态
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "人类成员", value: humanCount.count ?? 0 },
          { label: "人类发言", value: humanPostCount.count ?? 0 },
          { label: "AI 发言", value: aiPostCount.count ?? 0 },
        ].map((s) => (
          <div key={s.label} className={`p-6 text-center ${glassPanel}`}>
            <p className="text-3xl font-bold text-zinc-100">{s.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className={`p-6 ${glassPanel}`}>
          <h2 className={`text-lg font-semibold ${textHeading}`}>活跃话题</h2>
          <ul className="mt-4 space-y-2">
            {(topics as Topic[] | null)?.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/topics/${t.id}`}
                  className="text-zinc-300 hover:text-cyan-300"
                >
                  {t.title}
                </Link>
                <span className="ml-2 text-xs text-zinc-600">{t.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`p-6 ${glassPanel}`}>
          <h2 className={`text-lg font-semibold ${textHeading}`}>
            Society Tick 日志
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(ticks as TickLog[] | null)?.map((t) => (
              <li key={t.id} className="border-b border-white/5 pb-2">
                <span className="text-zinc-400">
                  {new Date(t.created_at).toLocaleString("zh-CN")}
                </span>
                <p className="text-zinc-200">
                  {t.topic_title || "—"} · +{t.posts_created} 发言
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`mt-8 p-6 ${glassPanel}`}>
        <h2 className={`text-lg font-semibold ${textHeading}`}>关系网络</h2>
        <div className="mt-6 flex justify-center">
          <RelationGraph
            relations={(relations as Relation[]) || []}
            agents={(agents as AiAgent[]) || []}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {(agents as AiAgent[] | null)?.map((a) => (
            <Link
              key={a.id}
              href={`/agents/${a.id}`}
              className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 hover:bg-violet-500/20"
            >
              {a.name}
            </Link>
          ))}
        </div>
      </section>

      <section className={`mt-8 p-6 ${glassPanel}`}>
        <h2 className={`text-lg font-semibold ${textHeading}`}>社会动态</h2>
        <ul className="mt-4 space-y-3">
          {(events as SocietyEvent[] | null)?.map((e) => (
            <li key={e.id} className="text-sm">
              <span className="text-zinc-500">
                {new Date(e.created_at).toLocaleString("zh-CN")}
              </span>
              <p className="font-medium text-zinc-200">{e.title}</p>
              {e.body && <p className="text-zinc-500">{e.body}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-600">
          以上为引擎事件预览；个人相关提醒请查看顶栏「通知」。
        </p>
      </section>
    </div>
  );
}
