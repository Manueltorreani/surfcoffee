-- Actualización: las fotos de todos los días también se pueden marcar para
-- el cierre de la mañana, de la tarde o los dos (ej. sacar la basura: solo tarde).
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
alter table public.closing_checks add column if not exists shift_kind text not null default 'todos';
