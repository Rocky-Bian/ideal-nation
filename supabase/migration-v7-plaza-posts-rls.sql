-- 灵感广场（plaza）：允许已登录人类发帖与回复

drop policy if exists "posts_insert_human_zones" on public.posts;

create policy "posts_insert_human_zones" on public.posts
  for insert with check (
    auth.role() = 'authenticated'
    and author_type = 'human'
    and author_id = auth.uid()
    and zone in ('human', 'hybrid', 'plaza')
  );

-- 人类可隐藏自己的帖子（软删除）
drop policy if exists "posts_update_own_human" on public.posts;

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

grant update on public.posts to authenticated;
