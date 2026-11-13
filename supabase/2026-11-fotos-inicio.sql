-- Fotos del inicio (carrusel) y foto de "Quiénes somos".
-- Correlo una vez en Supabase → SQL Editor. Se puede correr de nuevo sin problema.
-- Incluye también lo de supabase/2026-10-fotos-menu.sql por si todavía no lo corriste.

-- fotos de productos
alter table public.menu_items add column if not exists image_url text;

-- foto de "Quiénes somos" (si queda vacía se usa la de la web)
alter table public.settings add column if not exists about_image_url text;

-- carrusel del inicio
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text not null default '',
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.gallery enable row level security;
drop policy if exists gallery_read on public.gallery;
create policy gallery_read on public.gallery for select using (active or public.is_admin());
drop policy if exists gallery_admin on public.gallery;
create policy gallery_admin on public.gallery for all using (public.is_admin()) with check (public.is_admin());

-- carpeta pública de fotos (productos y carrusel); solo los administradores suben o borran
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu', 'menu', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists menu_files_write on storage.objects;
create policy menu_files_write on storage.objects for insert
  with check (bucket_id = 'menu' and public.is_admin());
drop policy if exists menu_files_update on storage.objects;
create policy menu_files_update on storage.objects for update
  using (bucket_id = 'menu' and public.is_admin());
drop policy if exists menu_files_delete on storage.objects;
create policy menu_files_delete on storage.objects for delete
  using (bucket_id = 'menu' and public.is_admin());
