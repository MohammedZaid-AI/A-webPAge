-- Run once in Supabase: SQL Editor > New query > paste > Run.

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  category    text not null check (char_length(category) between 1 and 60),
  code        text not null unique check (char_length(code) between 1 and 40),
  description text not null default '' check (char_length(description) <= 2000),
  price       numeric(10,2) check (price is null or price >= 0),
  image_path  text,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone can read. Only a signed-in user (the admin) can change.
create policy "read products"   on public.products for select to anon, authenticated using (true);
create policy "add products"    on public.products for insert to authenticated with check (true);
create policy "edit products"   on public.products for update to authenticated using (true) with check (true);
create policy "delete products" on public.products for delete to authenticated using (true);

-- Public bucket for product photos. Only a signed-in user can add, replace or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg','image/png','image/webp']);

create policy "upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "replace photos" on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "remove photos" on storage.objects for delete to authenticated using (bucket_id = 'product-images');
