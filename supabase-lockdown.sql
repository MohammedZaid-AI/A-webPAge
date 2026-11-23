-- For a project that already ran the OLD supabase.sql. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Step 1: replace YOUR_ADMIN_EMAIL with the email you sign in with on the admin page, then run everything.
-- Step 2: sign out and sign in again on the admin page (old login tokens do not carry the admin role).
-- Step 3: Authentication > Sign In / Providers > turn OFF "Allow new users to sign up".

update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}' where email = 'mohammedzaid83505@gmail.com';

drop policy if exists "add products"    on public.products;
drop policy if exists "edit products"   on public.products;
drop policy if exists "delete products" on public.products;
create policy "add products"    on public.products for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "edit products"   on public.products for update to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "delete products" on public.products for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "upload photos"  on storage.objects;
drop policy if exists "replace photos" on storage.objects;
drop policy if exists "remove photos"  on storage.objects;
create policy "upload photos"  on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy "replace photos" on storage.objects for update to authenticated using (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy "remove photos"  on storage.objects for delete to authenticated using (bucket_id = 'product-images' and ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

alter table public.products add constraint products_image_path_format
  check (image_path is null or image_path ~ '^[0-9a-f-]{36}\.jpg$') not valid;
