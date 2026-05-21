-- 人类通知中心（回复我 / ☆ 感兴趣话题动态 / 进入理想国）

create table if not exists public.user_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (
    type in ('reply_to_me', 'topic_activity', 'topic_promoted')
  ),
  title text not null,
  body text,
  post_id uuid references public.posts(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_read_own" on public.user_notifications;
create policy "user_notifications_read_own"
  on public.user_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;
