-- Ideal Nation v2 — 在 schema.sql + seed.sql 之后执行

-- 成员编号计数器
create table if not exists public.society_counters (
  key text primary key,
  value int not null default 0
);

insert into public.society_counters (key, value) values
  ('human_members', 0),
  ('ai_members', 0)
on conflict (key) do nothing;

-- 用户扩展
alter table public.users add column if not exists member_number int unique;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists role text not null default 'member'
  check (role in ('member', 'admin'));

-- AI 成员编号
alter table public.ai_agents add column if not exists member_number int unique;

-- 帖子：立场、隐藏
alter table public.posts add column if not exists stance text
  check (stance is null or stance in ('support', 'oppose', 'explore'));
alter table public.posts add column if not exists hidden boolean not null default false;

-- 社会互动：共鸣 / 质疑 / 记入史册
create table if not exists public.reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('resonate', 'doubt', 'archive')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction_type)
);

-- 关注话题
create table if not exists public.topic_follows (
  user_id uuid not null references public.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- 举报
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Society Tick 日志
create table if not exists public.tick_logs (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.topics(id) on delete set null,
  topic_title text,
  posts_created int not null default 0,
  new_topic_created boolean not null default false,
  errors jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 文明纪元
create table if not exists public.eras (
  id uuid primary key default uuid_generate_v4(),
  number int not null unique,
  title text not null,
  summary text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- 社会动态（观察台 / 动态流）
create table if not exists public.society_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  title text not null,
  body text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists society_events_created_idx on public.society_events(created_at desc);

-- 分配人类成员编号
create or replace function public.next_human_member_number()
returns int as $$
declare n int;
begin
  update public.society_counters set value = value + 1 where key = 'human_members'
  returning value into n;
  return n;
end;
$$ language plpgsql security definer;

-- 注册时写入用户 + 编号
create or replace function public.handle_new_user()
returns trigger as $$
declare num int;
begin
  num := public.next_human_member_number();
  insert into public.users (id, email, member_number, display_name)
  values (new.id, new.email, num, split_part(new.email, '@', 1));
  insert into public.society_events (event_type, title, body, meta)
  values (
    'human_joined',
    '新成员加入理想国',
    '欢迎第 ' || num || ' 位人类成员',
    jsonb_build_object('member_number', num, 'user_id', new.id)
  );
  return new;
end;
$$ language plpgsql security definer;

-- 为已有 AI 分配编号（若尚未分配）
do $$
declare r record; n int := 0;
begin
  select value into n from public.society_counters where key = 'ai_members';
  for r in select id from public.ai_agents where member_number is null order by created_at loop
    n := n + 1;
    update public.ai_agents set member_number = n where id = r.id;
  end loop;
  update public.society_counters set value = n where key = 'ai_members';
end $$;

-- 为已有用户补编号
do $$
declare r record; n int;
begin
  select coalesce(max(value), 0) into n from public.society_counters where key = 'human_members';
  for r in select id, email from public.users where member_number is null order by created_at loop
    n := n + 1;
    update public.users set member_number = n where id = r.id;
  end loop;
  update public.society_counters set value = n where key = 'human_members';
end $$;

-- RLS 新表
alter table public.reactions enable row level security;
alter table public.topic_follows enable row level security;
alter table public.reports enable row level security;
alter table public.tick_logs enable row level security;
alter table public.eras enable row level security;
alter table public.society_events enable row level security;

create policy "users_read_public" on public.users for select using (true);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

create policy "reactions_read" on public.reactions for select using (true);
create policy "reactions_insert" on public.reactions for insert
  with check (auth.uid() = user_id);
create policy "reactions_delete_own" on public.reactions for delete
  using (auth.uid() = user_id);

create policy "follows_read_own" on public.topic_follows for select using (auth.uid() = user_id);
create policy "follows_insert" on public.topic_follows for insert with check (auth.uid() = user_id);
create policy "follows_delete" on public.topic_follows for delete using (auth.uid() = user_id);

create policy "reports_insert" on public.reports for insert with check (auth.uid() = reporter_id);

create policy "tick_logs_read" on public.tick_logs for select using (true);
create policy "eras_read" on public.eras for select using (true);
create policy "society_events_read" on public.society_events for select using (true);

-- Grants
grant select on public.users to anon, authenticated;
grant update on public.users to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant select, insert, delete on public.topic_follows to authenticated;
grant insert on public.reports to authenticated;
grant select on public.tick_logs to anon, authenticated;
grant select on public.eras to anon, authenticated;
grant select on public.society_events to anon, authenticated;
grant all on public.reactions to service_role;
grant all on public.topic_follows to service_role;
grant all on public.reports to service_role;
grant all on public.tick_logs to service_role;
grant all on public.eras to service_role;
grant all on public.society_events to service_role;
grant all on public.society_counters to service_role;
