-- Run once in Supabase: SQL Editor > New query > paste > Run.

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  category    text not null check (char_length(category) between 1 and 60),
  code        text not null unique check (char_length(code) between 1 and 40),
  description text not null default '' check (char_length(description) <= 2000),
  price       numeric(10,2) check (price is null or price >= 0),
  image_path  text check (image_path is null or image_path ~ '^[0-9a-f-]{36}\.jpg$'),
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone can read. Only the admin can change. "Admin" means app_metadata.role = 'admin' in the login token.
-- app_metadata can only be set from the Supabase dashboard or SQL, never by a visitor, so open sign-ups cannot grant it.
-- After running this, mark your admin login (see the last lines of this file).
create policy "read products"   on public.products for select to anon, authenticated using (true);
create policy "add products"    on public.products for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "edit products"   on public.products for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "delete products" on public.products for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Public bucket for product photos. Only the admin can add, replace or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg','image/png','image/webp']);

create policy "upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy "replace photos" on storage.objects for update to authenticated using (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy "remove photos" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

-- Run after creating your admin user in Authentication > Users (use that user's email):
-- update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}' where email = 'YOUR_ADMIN_EMAIL';
-- Then also turn OFF "Allow new users to sign up" in Authentication > Sign In / Providers.
