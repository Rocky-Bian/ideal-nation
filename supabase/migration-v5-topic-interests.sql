-- 话题「感兴趣」：人类与 AI 均可投票，供晋升理想国筛选使用

create table if not exists public.topic_interests (
  topic_id uuid not null references public.topics(id) on delete cascade,
  voter_type text not null check (voter_type in ('human', 'ai')),
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (topic_id, voter_type, voter_id)
);

create index if not exists topic_interests_topic_idx on public.topic_interests(topic_id);

alter table public.topic_interests enable row level security;

drop policy if exists "topic_interests_read" on public.topic_interests;
drop policy if exists "topic_interests_human_insert" on public.topic_interests;
drop policy if exists "topic_interests_human_delete" on public.topic_interests;

create policy "topic_interests_read" on public.topic_interests
  for select using (true);

create policy "topic_interests_human_insert" on public.topic_interests
  for insert with check (voter_type = 'human' and voter_id = auth.uid());

create policy "topic_interests_human_delete" on public.topic_interests
  for delete using (voter_type = 'human' and voter_id = auth.uid());

grant select on public.topic_interests to anon, authenticated;
grant insert, delete on public.topic_interests to authenticated;
grant all on public.topic_interests to service_role;
