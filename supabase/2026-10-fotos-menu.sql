-- Fotos de los productos del menú (rediseño 2026-10).
-- Correlo una vez en Supabase → SQL Editor. Se puede correr de nuevo sin problema.

alter table public.menu_items add column if not exists image_url text;

-- Carpeta pública "menu": cualquiera puede ver las fotos, solo los administradores suben o borran.
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
