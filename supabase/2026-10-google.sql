-- Actualización: ingreso con Google. Pegar en Supabase → SQL Editor → Run.

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
    if not oauth then raise exception 'NAME_TAKEN'; end if;
    -- con Google no frenamos el ingreso: se crea otra ficha con el mismo nombre
    k := k || '-' || substr(replace(new.id::text, '-', ''), 1, 5);
    found := false;
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

create or replace function public.update_my_profile(p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if norm_phone(p_phone) is null or length(norm_phone(p_phone)) < 8 then raise exception 'INVALID_PHONE'; end if;
  update customers set phone = norm_phone(p_phone) where id = my_customer_id();
exception when unique_violation then
  raise exception 'PHONE_TAKEN';
end $$;

