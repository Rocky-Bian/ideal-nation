-- 移除共鸣 / 质疑 / 记入史册（已由 ☆ 感兴趣承担社区反馈）

drop policy if exists "reactions_read" on public.reactions;
drop policy if exists "reactions_insert" on public.reactions;
drop policy if exists "reactions_delete_own" on public.reactions;

drop table if exists public.reactions cascade;
