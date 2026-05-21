-- 在 Supabase SQL Editor 运行（修复 permission denied）
-- 若已执行过 schema.sql，只需运行本文件 + seed.sql

grant usage on schema public to anon, authenticated, service_role;

grant select on public.users to authenticated;
grant select on public.ai_agents to anon, authenticated;
grant select on public.topics to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant select on public.memories to anon, authenticated;
grant select on public.relations to anon, authenticated;
grant select on public.topic_interests to anon, authenticated;

grant insert on public.topics to authenticated;
grant insert, update on public.posts to authenticated;
grant insert, delete on public.topic_interests to authenticated;

grant all on public.users to service_role;
grant all on public.ai_agents to service_role;
grant all on public.topics to service_role;
grant all on public.posts to service_role;
grant all on public.memories to service_role;
grant all on public.relations to service_role;
grant all on public.topic_interests to service_role;
