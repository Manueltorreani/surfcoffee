-- Actualización: turnos fijos (Mañana / Tarde) y foto de llegada en la tablet.
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.

-- horarios de cada turno (se cambian desde Panel → Turnos)
alter table public.settings add column if not exists turnos_def jsonb not null default
  '[{"key":"manana","label":"Mañana","from":"08:30","to":"13:00","days":[1,2,3,4,5,6]},
    {"key":"tarde","label":"Tarde","from":"15:30","to":"20:00","days":[0,1,2,3,4,5,6]}]';

-- a qué turno fijo corresponde cada turno cargado
alter table public.staff_shifts add column if not exists kind text;

-- foto del local al marcar la llegada
alter table public.staff_attendance add column if not exists photo_path text;
