-- Own customer profile edit: no role, email, identity or arbitrary customer changes.
create function shoefit_private.actualizar_perfil_cliente(p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid(); v_user integer; v_client integer; v_field record;
 v_max integer; v_talla numeric; v_result jsonb;
begin
 if v_uid is null then raise exception using errcode='42501',message='forbidden'; end if;
 select u.id_user,c.id_cliente into v_user,v_client
 from public.usuario u join public.cliente c on c.id_doe=u.id_user
 where u.auth_id=v_uid and u.rolez='cliente' for update of u,c;
 if not found then raise exception using errcode='42501',message='forbidden'; end if;
 if p_cambios is null or jsonb_typeof(p_cambios)<>'object' or p_cambios='{}'::jsonb then
  raise exception using errcode='22023',message='invalid_profile';
 end if;
 for v_field in select key,value from jsonb_each(p_cambios) loop
  v_max:=case v_field.key when 'nombre' then 100 when 'ap' then 100 when 'am' then 100 when 'calle' then 150 when 'numero' then 20 when 'colonia' then 100 when 'cp' then 5 else null end;
  if v_field.key='talla' then
   if v_field.value='null'::jsonb then continue; end if;
   if jsonb_typeof(v_field.value)<>'number' then raise exception using errcode='22023',message='invalid_profile';end if;
   v_talla:=(v_field.value#>>'{}')::numeric;
   if v_talla<=0 or v_talla>999.9 or trunc(v_talla,1)<>v_talla then raise exception using errcode='22023',message='invalid_profile';end if;
  elsif v_max is null then
   raise exception using errcode='22023',message='invalid_profile';
  elsif v_field.value='null'::jsonb and v_field.key<>'nombre' then continue;
  elsif jsonb_typeof(v_field.value)<>'string' or length(trim(v_field.value#>>'{}')) not between 1 and v_max or
    (v_field.key='cp' and trim(v_field.value#>>'{}') !~ '^[0-9]{5}$') then
   raise exception using errcode='22023',message='invalid_profile';
  end if;
 end loop;
 update public.usuario u set
  nombre=case when p_cambios ? 'nombre' then trim(p_cambios->>'nombre') else u.nombre end,
  ap=case when p_cambios ? 'ap' then trim(p_cambios->>'ap') else u.ap end,
  am=case when p_cambios ? 'am' then trim(p_cambios->>'am') else u.am end
 where u.id_user=v_user;
 update public.cliente c set
  calle=case when p_cambios ? 'calle' then trim(p_cambios->>'calle') else c.calle end,
  numero=case when p_cambios ? 'numero' then trim(p_cambios->>'numero') else c.numero end,
  colonia=case when p_cambios ? 'colonia' then trim(p_cambios->>'colonia') else c.colonia end,
  cp=case when p_cambios ? 'cp' then trim(p_cambios->>'cp') else c.cp end,
  talla=case when p_cambios ? 'talla' then (p_cambios->>'talla')::numeric else c.talla end
 where c.id_cliente=v_client;
 select jsonb_build_object('id_user',u.id_user,'nombre',u.nombre,'ap',u.ap,'am',u.am,'mail',u.mail,'rolez',u.rolez,'id_cliente',c.id_cliente,'calle',c.calle,'numero',c.numero,'colonia',c.colonia,'cp',c.cp,'talla',c.talla)
 into v_result from public.usuario u join public.cliente c on c.id_doe=u.id_user where u.id_user=v_user;
 return v_result;
end;
$$;
create function public.shoefit_actualizar_perfil(p_cambios jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select shoefit_private.actualizar_perfil_cliente(p_cambios);
$$;
revoke all on function shoefit_private.actualizar_perfil_cliente(jsonb),public.shoefit_actualizar_perfil(jsonb) from public,anon,authenticated;
grant execute on function shoefit_private.actualizar_perfil_cliente(jsonb),public.shoefit_actualizar_perfil(jsonb) to authenticated;
