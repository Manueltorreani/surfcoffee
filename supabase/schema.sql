-- =====================================================================
-- Surf Coffee · esquema de base de datos para Supabase
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de
-- una vez: crea lo que falta y reemplaza funciones y políticas.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

-- ---------- utilidades ----------
create or replace function public.name_key(txt text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(txt,''))), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.norm_phone(txt text) returns text
language sql immutable as $$
  select nullif(regexp_replace(regexp_replace(coalesce(txt,''), '\D', '', 'g'), '^0+', ''), '')
$$;

-- ---------- administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid())
$$;

-- ---------- ajustes (una sola fila) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  tagline text default 'Café de especialidad, buena música y olor a mar.',
  about_title text default 'Manu y Mate',
  about text default '',
  address text default 'Avellaneda 1378 (esq. Olavarría)',
  instagram text default '',
  hours text default E'Lunes a viernes | 8:00 – 20:00\nSábados y domingos | 9:00 – 21:00',
  pesos_por_punto int not null default 100,
  welcome_points int not null default 50,
  delivery_fee int not null default 1500,
  delivery_open boolean not null default true,
  delivery_from text default '09:00',
  delivery_to text default '20:00',
  delivery_days int[] not null default '{0,1,2,3,4,5,6}',
  cafe_h text default 'Avellaneda',
  cafe_v text default 'Olavarría',
  -- calles: [{ "name": "...", "min": 1100, "max": 1700 }] en orden de borde a borde
  zone_h jsonb not null default '[]',
  zone_v jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
insert into public.settings (id, zone_h, zone_v) values (1,
 '[{"name":"Castelli","min":1100,"max":1700},{"name":"Alvarado","min":1100,"max":1700},{"name":"Avellaneda","min":1100,"max":1700},{"name":"San Lorenzo","min":1100,"max":1700},{"name":"Julio A. Roca","min":1100,"max":1700},{"name":"Rodríguez Peña","min":1100,"max":1700}]',
 '[{"name":"Las Heras"},{"name":"Sarmiento"},{"name":"Alsina"},{"name":"Olavarría"},{"name":"Güemes"},{"name":"Carlos Alvear"},{"name":"Viamonte"}]')
on conflict (id) do nothing;

-- ---------- menú y premios ----------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Otros',
  description text default '',
  price int not null default 0,
  sort int not null default 100,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  cost int not null check (cost > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- clientes y puntos ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  name_key text not null unique,
  email text,
  phone text,
  address jsonb,
  points int not null default 0,
  visits int not null default 0,
  total_spent bigint not null default 0,
  last_visit timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_email_uq on public.customers (lower(email)) where email is not null;
create unique index if not exists customers_phone_uq on public.customers (phone) where phone is not null;

create table if not exists public.point_txns (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('compra','canje','bienvenida','ajuste')),
  amount bigint,
  points int not null,
  reward text,
  source text default 'mostrador',
  created_at timestamptz not null default now()
);
create index if not exists point_txns_customer_idx on public.point_txns (customer_id, created_at desc);

create or replace function public.my_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.customers where auth_user_id = auth.uid()
$$;

-- ---------- chat y pedidos ----------
create table if not exists public.conversations (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  last_text text,
  order_status text,
  unread_admin boolean not null default false,
  unread_client boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  sender text not null check (sender in ('cliente','cafe')),
  type text not null check (type in ('text','order','status','file')),
  text text,
  order_data jsonb,          -- items, subtotal, envio, total, address, note
  status text,               -- estado del pedido (solo type = order)
  file_path text,            -- ruta en el bucket "chat"
  file_name text,
  file_mime text,
  file_size int,
  created_at timestamptz not null default now()
);
create index if not exists messages_customer_idx on public.messages (customer_id, created_at);

-- Al llegar un mensaje se actualiza la conversación (para el inbox)
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare label text;
begin
  label := case new.type
    when 'text' then new.text
    when 'order' then 'Pedido nuevo · $' || coalesce((new.order_data->>'total'),'0')
    when 'file' then 'Archivo: ' || coalesce(new.file_name,'')
    else new.text end;
  insert into conversations (customer_id, last_text, order_status, unread_admin, unread_client, updated_at)
  values (new.customer_id,
          case when new.sender = 'cafe' then 'Vos: ' || label else label end,
          case when new.type = 'order' then 'nuevo' end,
          new.sender = 'cliente', new.sender = 'cafe', now())
  on conflict (customer_id) do update set
    last_text = excluded.last_text,
    order_status = coalesce(excluded.order_status, conversations.order_status),
    unread_admin = conversations.unread_admin or excluded.unread_admin,
    unread_client = conversations.unread_client or excluded.unread_client,
    updated_at = now();
  return new;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

-- ---------- alta y vinculación de cuentas web ----------
-- Al crear un usuario (registro web) se crea su ficha de cliente, o se
-- vincula a la que ya existe por compras en el local (mismo nombre).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- registro con email: viene "name"; con Google: viene "full_name" / "name"
  nm text := trim(coalesce(nullif(new.raw_user_meta_data->>'name',''), new.raw_user_meta_data->>'full_name', ''));
  ph text := norm_phone(new.raw_user_meta_data->>'phone');
  oauth boolean := coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email';
  k text := name_key(nm);
  c customers%rowtype;
  wel int;
begin
  if k = '' then
    if not oauth then return new; end if;            -- admins creados a mano (sin nombre)
    nm := split_part(new.email, '@', 1); k := name_key(nm);
  end if;
  if ph is not null and exists(select 1 from customers where phone = ph and auth_user_id is not null) then
    if oauth then ph := null; else raise exception 'EMAIL_OR_PHONE_TAKEN'; end if;
  end if;
  select * into c from customers where name_key = k;
  if found and c.auth_user_id is not null then
    -- un nombre = una cuenta (también con Google)
    raise exception 'NAME_TAKEN';
  end if;
  if found then
    update customers set auth_user_id = new.id, email = lower(new.email), phone = coalesce(ph, phone)
      where id = c.id;
  else
    select welcome_points into wel from settings where id = 1;
    insert into customers (auth_user_id, name, name_key, email, phone, points)
      values (new.id, nm, k, lower(new.email), ph, coalesce(wel,0))
      returning * into c;
    if coalesce(wel,0) > 0 then
      insert into point_txns (customer_id, type, points) values (c.id, 'bienvenida', wel);
    end if;
  end if;
  return new;
exception when unique_violation then
  raise exception 'EMAIL_OR_PHONE_TAKEN';
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- puntos (solo administradores o el servidor) ----------
create or replace function public.register_purchase(p_name text, p_amount bigint, p_source text default 'mostrador')
returns json language plpgsql security definer set search_path = public as $$
declare
  k text := name_key(p_name);
  ppp int; pts int; c customers%rowtype; is_new boolean := false; wel int;
begin
  if not (is_admin() or auth.role() = 'service_role') then raise exception 'FORBIDDEN'; end if;
  if k = '' or p_amount is null or p_amount <= 0 then raise exception 'INVALID'; end if;
  select pesos_por_punto, welcome_points into ppp, wel from settings where id = 1;
  pts := floor(p_amount / greatest(coalesce(ppp,100),1));
  select * into c from customers where name_key = k for update;
  if not found then
    is_new := true;
    insert into customers (name, name_key, points) values (initcap(trim(p_name)), k, coalesce(wel,0)) returning * into c;
    if coalesce(wel,0) > 0 then
      insert into point_txns (customer_id, type, points) values (c.id, 'bienvenida', wel);
    end if;
  end if;
  update customers set points = points + pts, visits = visits + 1, total_spent = total_spent + p_amount, last_visit = now()
    where id = c.id returning * into c;
  insert into point_txns (customer_id, type, amount, points, source) values (c.id, 'compra', p_amount, pts, coalesce(p_source,'mostrador'));
  return json_build_object('customer_id', c.id, 'name', c.name, 'points_added', pts, 'points', c.points, 'new_customer', is_new);
end $$;

create or replace function public.redeem_reward(p_customer uuid, p_reward uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r rewards%rowtype; c customers%rowtype;
begin
  if not (is_admin() or auth.role() = 'service_role') then raise exception 'FORBIDDEN'; end if;
  select * into r from rewards where id = p_reward;
  if not found then raise exception 'REWARD_NOT_FOUND'; end if;
  select * into c from customers where id = p_customer for update;
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  if c.points < r.cost then raise exception 'NOT_ENOUGH_POINTS'; end if;
  update customers set points = points - r.cost where id = c.id returning * into c;
  insert into point_txns (customer_id, type, points, reward) values (c.id, 'canje', -r.cost, r.name);
  return json_build_object('customer_id', c.id, 'reward', r.name, 'points', c.points);
end $$;

-- ---------- pedidos de delivery (precios y zona se validan acá) ----------
create or replace function public.place_order(p_items jsonb, p_street text, p_num int, p_piso text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  cid uuid := my_customer_id();
  s settings%rowtype;
  st jsonb; it jsonb; m menu_items%rowtype;
  items jsonb := '[]'; sub bigint := 0; q int;
  now_ar timestamp := (now() at time zone 'America/Argentina/Buenos_Aires');
  dow int := extract(dow from now_ar); mins int := extract(hour from now_ar)*60 + extract(minute from now_ar);
  f int; t int; open_now boolean; mid bigint;
begin
  if cid is null then raise exception 'NOT_LOGGED_IN'; end if;
  select * into s from settings where id = 1;
  -- horario
  if not s.delivery_open then raise exception 'DELIVERY_CLOSED'; end if;
  f := split_part(s.delivery_from,':',1)::int*60 + split_part(s.delivery_from,':',2)::int;
  t := split_part(s.delivery_to,':',1)::int*60 + split_part(s.delivery_to,':',2)::int;
  open_now := case when f <= t then dow = any(s.delivery_days) and mins >= f and mins < t
                   else (dow = any(s.delivery_days) and mins >= f) or (((dow+6)%7) = any(s.delivery_days) and mins < t) end;
  if not open_now then raise exception 'DELIVERY_CLOSED'; end if;
  -- zona
  select e.v into st from jsonb_array_elements(s.zone_h || s.zone_v) as e(v) where e.v->>'name' = p_street limit 1;
  if st is null or p_num is null or p_num <= 0
     or (st->>'min' is not null and p_num < (st->>'min')::int)
     or (st->>'max' is not null and p_num > (st->>'max')::int) then
    raise exception 'OUT_OF_ZONE';
  end if;
  -- productos con precios de la base
  for it in select * from jsonb_array_elements(p_items) loop
    q := greatest(1, least(50, coalesce((it->>'qty')::int,1)));
    select * into m from menu_items where id = (it->>'id')::uuid and available;
    if found then
      items := items || jsonb_build_object('name', m.name, 'price', m.price, 'qty', q);
      sub := sub + m.price * q;
    end if;
  end loop;
  if jsonb_array_length(items) = 0 then raise exception 'EMPTY_ORDER'; end if;
  insert into messages (customer_id, sender, type, status, order_data)
  values (cid, 'cliente', 'order', 'nuevo', jsonb_build_object(
    'items', items, 'subtotal', sub, 'envio', s.delivery_fee, 'total', sub + s.delivery_fee,
    'address', p_street || ' ' || p_num || coalesce(nullif(', ' || trim(p_piso), ', '), ''),
    'note', coalesce(p_note,'')))
  returning id into mid;
  update customers set address = jsonb_build_object('street', p_street, 'num', p_num, 'piso', coalesce(p_piso,'')) where id = cid;
  return mid;
end $$;

create or replace function public.set_order_status(p_message bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare m messages%rowtype; txt text;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('confirmado','en_camino','entregado','cancelado') then raise exception 'INVALID'; end if;
  update messages set status = p_status where id = p_message and type = 'order' returning * into m;
  if not found then raise exception 'NOT_FOUND'; end if;
  txt := case p_status
    when 'confirmado' then 'Recibimos tu pedido y lo estamos preparando.'
    when 'en_camino' then 'Tu pedido salió. Ya va en camino.'
    when 'entregado' then 'Pedido entregado. ¡Que lo disfrutes!'
    else 'Tu pedido fue cancelado. Escribinos si tenés dudas.' end;
  insert into messages (customer_id, sender, type, status, text) values (m.customer_id, 'cafe', 'status', p_status, txt);
  update conversations set order_status = p_status where customer_id = m.customer_id;
end $$;

create or replace function public.mark_read(p_customer uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_customer is not null and is_admin() then
    update conversations set unread_admin = false where customer_id = p_customer;
  else
    update conversations set unread_client = false where customer_id = my_customer_id();
  end if;
end $$;

-- El cliente actualiza solo su celular o dirección
create or replace function public.update_my_profile(p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if norm_phone(p_phone) is null or length(norm_phone(p_phone)) < 8 then raise exception 'INVALID_PHONE'; end if;
  update customers set phone = norm_phone(p_phone) where id = my_customer_id();
exception when unique_violation then
  raise exception 'PHONE_TAKEN';
end $$;

-- ---------- seguridad por filas (RLS) ----------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.menu_items enable row level security;
alter table public.rewards enable row level security;
alter table public.customers enable row level security;
alter table public.point_txns enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for update using (is_admin()) with check (is_admin());

drop policy if exists menu_read on public.menu_items;
create policy menu_read on public.menu_items for select using (true);
drop policy if exists menu_admin on public.menu_items;
create policy menu_admin on public.menu_items for all using (is_admin()) with check (is_admin());

drop policy if exists rewards_read on public.rewards;
create policy rewards_read on public.rewards for select using (true);
drop policy if exists rewards_admin on public.rewards;
create policy rewards_admin on public.rewards for all using (is_admin()) with check (is_admin());

drop policy if exists customers_own on public.customers;
create policy customers_own on public.customers for select using (auth_user_id = auth.uid() or is_admin());
drop policy if exists customers_admin on public.customers;
create policy customers_admin on public.customers for update using (is_admin()) with check (is_admin());

drop policy if exists txns_own on public.point_txns;
create policy txns_own on public.point_txns for select using (customer_id = my_customer_id() or is_admin());

drop policy if exists conv_own on public.conversations;
create policy conv_own on public.conversations for select using (customer_id = my_customer_id() or is_admin());

drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select using (customer_id = my_customer_id() or is_admin());
drop policy if exists msg_client_insert on public.messages;
create policy msg_client_insert on public.messages for insert
  with check (customer_id = my_customer_id() and sender = 'cliente' and type in ('text','file'));
drop policy if exists msg_admin_insert on public.messages;
create policy msg_admin_insert on public.messages for insert
  with check (is_admin() and sender = 'cafe' and type in ('text','file'));

-- ---------- archivos del chat (fotos y comprobantes) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists chat_files_read on storage.objects;
create policy chat_files_read on storage.objects for select
  using (bucket_id = 'chat' and (public.is_admin() or (storage.foldername(name))[1] = public.my_customer_id()::text));
drop policy if exists chat_files_write on storage.objects;
create policy chat_files_write on storage.objects for insert
  with check (bucket_id = 'chat' and (public.is_admin() or (storage.foldername(name))[1] = public.my_customer_id()::text));

-- ---------- tiempo real ----------
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.conversations; exception when others then null; end;
  begin alter publication supabase_realtime add table public.customers; exception when others then null; end;
  begin alter publication supabase_realtime add table public.point_txns; exception when others then null; end;
end $$;

-- ---------- permisos de las funciones ----------
revoke all on function public.register_purchase(text,bigint,text) from public, anon;
revoke all on function public.redeem_reward(uuid,uuid) from public, anon;
revoke all on function public.set_order_status(bigint,text) from public, anon;
revoke all on function public.place_order(jsonb,text,int,text,text) from public, anon;
grant execute on function public.register_purchase(text,bigint,text) to authenticated, service_role;
grant execute on function public.redeem_reward(uuid,uuid) to authenticated, service_role;
grant execute on function public.set_order_status(bigint,text) to authenticated;
grant execute on function public.place_order(jsonb,text,int,text,text) to authenticated;

-- =====================================================================
-- Surf Coffee · sistema del equipo (personal, turnos, cierres y stock)
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.

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
