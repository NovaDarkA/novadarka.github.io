create function shoefit_private.registrar_cliente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user integer;
begin
  if new.email is null or new.is_anonymous then return new; end if;
  insert into public.usuario(auth_id,nombre,mail,rolez)
  values(new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'nombre'),100),''),'Cliente'),lower(trim(new.email)),'cliente')
  returning id_user into v_user;
  insert into public.cliente(id_doe) values(v_user);
  return new;
end;
$$;
revoke all on function shoefit_private.registrar_cliente() from public,anon,authenticated;
create trigger shoefit_registrar_cliente after insert on auth.users
for each row execute function shoefit_private.registrar_cliente();