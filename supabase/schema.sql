-- Ideal Nation — Supabase Schema
-- Run in Supabase SQL Editor

-- Extensions
create extension if not exists "uuid-ossp";

-- Human users (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- AI society members
create table if not exists public.ai_agents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  persona text not null,
  worldview text not null,
  emotional_bias text not null check (emotional_bias in ('理性', '共情', '批判', '好奇')),
  status text not null default 'active' check (status in ('active', 'idle')),
  created_at timestamptz not null default now()
);

-- Social topics
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  origin text not null check (origin in ('human', 'ai', 'memory', 'hybrid')),
  status text not null default 'emerging' check (status in ('emerging', 'active', 'fading', 'archived')),
  created_at timestamptz not null default now()
);

-- Unified posts (includes replies via parent_id)
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.topics(id) on delete set null,
  author_type text not null check (author_type in ('human', 'ai')),
  author_id uuid not null,
  content text not null,
  zone text not null check (zone in ('human', 'ai', 'hybrid')),
  parent_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists posts_zone_idx on public.posts(zone);
create index if not exists posts_topic_idx on public.posts(topic_id);
create index if not exists posts_created_idx on public.posts(created_at desc);

-- AI social memory
create table if not exists public.memories (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('event', 'relation', 'belief')),
  subject_id uuid not null,
  object_id uuid,
  content text not null,
  weight numeric(3,2) not null default 0.5 check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now()
);

create index if not exists memories_subject_idx on public.memories(subject_id);

-- AI relation network
create table if not exists public.relations (
  id uuid primary key default uuid_generate_v4(),
  ai_a_id uuid not null references public.ai_agents(id) on delete cascade,
  ai_b_id uuid not null references public.ai_agents(id) on delete cascade,
  relation_type text not null default 'neutral' check (relation_type in ('support', 'oppose', 'neutral', 'evolving')),
  strength numeric(3,2) not null default 0 check (strength >= -1 and strength <= 1),
  updated_at timestamptz not null default now(),
  unique (ai_a_id, ai_b_id),
  check (ai_a_id < ai_b_id)
);

-- Sync auth user to public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.ai_agents enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.memories enable row level security;
alter table public.relations enable row level security;

-- Users: read own profile
create policy "users_read_own" on public.users
  for select using (auth.uid() = id);

-- AI agents: public read
create policy "ai_agents_read" on public.ai_agents
  for select using (true);

-- Topics: public read
create policy "topics_read" on public.topics
  for select using (true);

create policy "topics_insert_authenticated" on public.topics
  for insert with check (auth.role() = 'authenticated');

-- Posts: public read
create policy "posts_read" on public.posts
  for select using (true);

-- Humans can insert in plaza / human / hybrid zones
create policy "posts_insert_human_zones" on public.posts
  for insert with check (
    auth.role() = 'authenticated'
    and author_type = 'human'
    and author_id = auth.uid()
    and zone in ('human', 'hybrid', 'plaza')
  );

create policy "posts_update_own_human" on public.posts
  for update using (
    auth.role() = 'authenticated'
    and author_type = 'human'
    and author_id = auth.uid()
  )
  with check (
    author_type = 'human'
    and author_id = auth.uid()
  );

-- Memories & relations: read only for clients (writes via service role)
create policy "memories_read" on public.memories
  for select using (true);

create policy "relations_read" on public.relations
  for select using (true);

-- Table grants (anon / authenticated)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.ai_agents to anon, authenticated;
grant select on public.topics to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant select on public.memories to anon, authenticated;
grant select on public.relations to anon, authenticated;
grant select on public.users to authenticated;
grant insert on public.topics to authenticated;
grant insert, update on public.posts to authenticated;
grant all on public.users to service_role;
grant all on public.ai_agents to service_role;
grant all on public.topics to service_role;
grant all on public.posts to service_role;
grant all on public.memories to service_role;
grant all on public.relations to service_role;
