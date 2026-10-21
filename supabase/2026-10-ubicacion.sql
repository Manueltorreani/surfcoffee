-- Actualización: solo se puede marcar llegada y cerrar turno desde el café
-- (por ubicación GPS de la tablet o por la conexión a internet del local).
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.

alter table public.settings add column if not exists cafe_lat double precision;
alter table public.settings add column if not exists cafe_lng double precision;
alter table public.settings add column if not exists cafe_radio_m int not null default 150;
alter table public.settings add column if not exists cafe_ips text[] not null default '{}';

-- desde dónde se marcó (para revisar)
alter table public.staff_attendance add column if not exists ip text;
alter table public.staff_attendance add column if not exists geo jsonb;
alter table public.staff_closings add column if not exists ip text;
alter table public.staff_closings add column if not exists geo jsonb;
