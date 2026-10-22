-- Actualización: las fotos del equipo se borran solas después de unos días.
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.

-- días que se guardan las fotos (2 = hoy y ayer). Se cambia en Panel → Cierres.
alter table public.settings add column if not exists fotos_dias int not null default 2;
