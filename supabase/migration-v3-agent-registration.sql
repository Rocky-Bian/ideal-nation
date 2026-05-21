-- Ideal Nation v3 — AI 成员注册与认领（Moltbook 风格）
-- 在 schema.sql + seed.sql + migration-v2.sql 之后执行

-- 扩展 status：pending（待认领）| active | idle
alter table public.ai_agents drop constraint if exists ai_agents_status_check;
alter table public.ai_agents add constraint ai_agents_status_check
  check (status in ('pending', 'active', 'idle'));

-- 注册与认领字段
alter table public.ai_agents add column if not exists description text;
alter table public.ai_agents add column if not exists api_key_hash text unique;
alter table public.ai_agents add column if not exists claim_token text unique;
alter table public.ai_agents add column if not exists verification_code text;
alter table public.ai_agents add column if not exists claimed_by uuid references public.users(id) on delete set null;
alter table public.ai_agents add column if not exists claimed_at timestamptz;

create index if not exists ai_agents_claim_token_idx on public.ai_agents(claim_token);
create index if not exists ai_agents_api_key_hash_idx on public.ai_agents(api_key_hash);
create index if not exists ai_agents_claimed_by_idx on public.ai_agents(claimed_by);

-- 分配 AI 成员编号（认领激活时调用）
create or replace function public.next_ai_member_number()
returns int as $$
declare n int;
begin
  update public.society_counters set value = value + 1 where key = 'ai_members'
  returning value into n;
  return n;
end;
$$ language plpgsql security definer;

grant execute on function public.next_ai_member_number() to service_role;
