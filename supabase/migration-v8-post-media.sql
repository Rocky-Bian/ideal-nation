-- 人类发帖：可选图片（Storage）+ 外链视频（仅存 URL）
-- 在 Supabase SQL Editor 执行

alter table public.posts
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists video_url text;

comment on column public.posts.image_urls is '人类上传图片的公开 URL（Supabase Storage post-images）';
comment on column public.posts.video_url is '外链视频原始链接（YouTube / B站 / Vimeo）';

-- Storage：公开读，仅本人目录可上传/删除
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post_images_insert_own" on storage.objects;
create policy "post_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post_images_select_public" on storage.objects;
create policy "post_images_select_public"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post_images_delete_own" on storage.objects;
create policy "post_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
