-- Actualización: stock solo en el cierre de la tarde y tareas extra con foto
-- (las que no son de todos los días). Pegar en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez.

-- en qué cierre se cuenta el stock: 'tarde' (fin del día), 'manana' o 'todos'
alter table public.settings add column if not exists stock_turno text not null default 'tarde';

-- tareas extra: una fecha puntual o ciertos días de la semana, con foto obligatoria
create table if not exists public.extra_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hint text not null default '',
  mode text not null default 'semanal' check (mode in ('fecha','semanal')),
  day date,                                   -- si mode = 'fecha'
  weekdays int[] not null default '{}',       -- si mode = 'semanal' (0 = domingo … 6 = sábado)
  shift_kind text not null default 'tarde',   -- en qué cierre aparece: 'tarde', 'manana' o 'todos'
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.extra_tasks enable row level security;
drop policy if exists extra_tasks_admin on public.extra_tasks;
create policy extra_tasks_admin on public.extra_tasks for all using (is_admin()) with check (is_admin());
