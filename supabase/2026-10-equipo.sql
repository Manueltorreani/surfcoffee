-- =====================================================================
-- Surf Coffee · sistema del equipo (personal, turnos, cierres y stock)
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- (Ya está incluido al final de schema.sql para instalaciones nuevas.)
-- =====================================================================

-- tolerancia de llegada (minutos) para el mensaje "justo / tarde"
alter table public.settings add column if not exists tolerancia_min int not null default 10;

-- ---------- personal (empleados y dueños) ----------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'empleado' check (role in ('empleado','dueño')),
  has_pin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- PIN de cada persona: tabla aparte, sin acceso desde el navegador (solo el servidor)
create table if not exists public.staff_pins (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  pin_hash text not null,              -- scrypt, nunca el PIN en texto
  failed int not null default 0,
  locked_until timestamptz
);

-- ---------- dispositivos autorizados (tablet del café) ----------
create table if not exists public.staff_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,     -- sha256 del token guardado en el dispositivo
  revoked boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- turnos (horarios) ----------
create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  day date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists staff_shifts_day_idx on public.staff_shifts (day, start_time);

-- ---------- llegadas (las registra el software de ventas al abrir caja) ----------
create table if not exists public.staff_attendance (
  id bigint generated always as identity primary key,
  staff_id uuid not null references public.staff(id) on delete cascade,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  day date not null,
  clock_in timestamptz not null default now(),
  minutes_late int,                    -- negativo = llegó antes
  status text not null check (status in ('antes','justo','tarde','sin_turno')),
  source text not null default 'pos'
);
create index if not exists staff_attendance_day_idx on public.staff_attendance (day desc, staff_id);

-- ---------- fotos obligatorias del cierre ----------
create table if not exists public.closing_checks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hint text not null default '',
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.closing_checks (name, hint, sort)
select v.name, v.hint, v.sort from (values
  ('Cafetera limpia', 'Grupos, vaporizador y bandeja limpios', 10),
  ('Cocina', 'Mesadas limpias y todo guardado', 20),
  ('Fiambrera', 'Ordenada, tapada y con fecha', 30),
  ('Baños', 'Inodoro, lavamanos y piso', 40),
  ('Pisos', 'Salón barrido y trapeado', 50)
) as v(name, hint, sort)
where not exists (select 1 from public.closing_checks);

-- ---------- insumos a contar al cierre ----------
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'u',
  min_qty numeric not null default 0,
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.stock_items (name, unit, min_qty, sort)
select v.name, v.unit, v.min_qty, v.sort from (values
  ('Leche entera', 'L', 10, 10),
  ('Café en grano', 'kg', 2, 20),
  ('Pan', 'u', 6, 30),
  ('Jamón cocido', 'paq.', 2, 40),
  ('Queso', 'paq.', 2, 50),
  ('Medialunas congeladas', 'u', 36, 60),
  ('Vasos 12 oz', 'u', 100, 70)
) as v(name, unit, min_qty, sort)
where not exists (select 1 from public.stock_items);

-- ---------- cierres de turno ----------
create table if not exists public.staff_closings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id) on delete set null,
  staff_name text not null,
  device_id uuid references public.staff_devices(id) on delete set null,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  day date not null,
  photos jsonb not null default '[]',   -- [{check_id, name, path, taken_at}]
  stock jsonb not null default '[]',    -- [{item_id, name, unit, qty, min}]
  missing jsonb not null default '[]',  -- insumos debajo del mínimo
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists staff_closings_day_idx on public.staff_closings (day desc, created_at desc);

-- ---------- seguridad: solo administradores desde el navegador ----------
-- (la tablet y el software de ventas pasan por la API del servidor)
alter table public.staff enable row level security;
alter table public.staff_pins enable row level security;   -- sin políticas: solo service role
alter table public.staff_devices enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.closing_checks enable row level security;
alter table public.stock_items enable row level security;
alter table public.staff_closings enable row level security;

drop policy if exists staff_admin on public.staff;
create policy staff_admin on public.staff for all using (is_admin()) with check (is_admin());
drop policy if exists staff_devices_admin on public.staff_devices;
create policy staff_devices_admin on public.staff_devices for all using (is_admin()) with check (is_admin());
drop policy if exists staff_shifts_admin on public.staff_shifts;
create policy staff_shifts_admin on public.staff_shifts for all using (is_admin()) with check (is_admin());
drop policy if exists staff_attendance_admin on public.staff_attendance;
create policy staff_attendance_admin on public.staff_attendance for all using (is_admin()) with check (is_admin());
drop policy if exists closing_checks_admin on public.closing_checks;
create policy closing_checks_admin on public.closing_checks for all using (is_admin()) with check (is_admin());
drop policy if exists stock_items_admin on public.stock_items;
create policy stock_items_admin on public.stock_items for all using (is_admin()) with check (is_admin());
drop policy if exists staff_closings_admin on public.staff_closings;
create policy staff_closings_admin on public.staff_closings for all using (is_admin()) with check (is_admin());

-- ---------- fotos de los cierres (privadas) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipo', 'equipo', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists equipo_files_read on storage.objects;
create policy equipo_files_read on storage.objects for select
  using (bucket_id = 'equipo' and public.is_admin());
