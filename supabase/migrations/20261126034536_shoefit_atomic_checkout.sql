-- Atomic customer checkout. No direct customer write grants, no trusted input price.
alter table public.pedido add column checkout_key uuid;
alter table public.pedido add constraint pedido_checkout_unique unique(id_cliente,checkout_key);
create function shoefit_private.crear_pedido(p_key uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_cliente integer; v_pedido integer;
  v_item record; v_variant record; v_existing jsonb; v_normal jsonb;
  v_count integer; v_total numeric;
begin
  if v_uid is null then raise exception using errcode='42501',message='forbidden'; end if;
  select c.id_cliente into v_cliente from public.cliente c join public.usuario u on u.id_user=c.id_doe
    where u.auth_id=v_uid and u.rolez='cliente' for update of c;
  if not found then raise exception using errcode='42501',message='forbidden'; end if;
  if p_key is null or p_items is null or jsonb_typeof(p_items)<>'array' then
    raise exception using errcode='22023',message='invalid_cart';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then raise exception using errcode='22023',message='invalid_cart'; end if;
  for v_item in select value as item from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item.item)<>'object' then raise exception using errcode='22023',message='invalid_cart'; end if;
    if not (v_item.item ? 'id_variante' and v_item.item ? 'cantidad') or
       (v_item.item - 'id_variante' - 'cantidad') <> '{}'::jsonb or
       jsonb_typeof(v_item.item->'id_variante')<>'number' or jsonb_typeof(v_item.item->'cantidad')<>'number' or
       (v_item.item->>'id_variante') !~ '^[1-9][0-9]{0,9}$' or
       (v_item.item->>'cantidad') !~ '^[1-9][0-9]?$' then
      raise exception using errcode='22023',message='invalid_cart';
    end if;
    if (v_item.item->>'id_variante')::bigint>2147483647 then raise exception using errcode='22023',message='invalid_cart'; end if;
  end loop;
  select count(distinct (i->>'id_variante')::integer),
    jsonb_agg(jsonb_build_object('id_variante',(i->>'id_variante')::integer,'cantidad',(i->>'cantidad')::integer) order by (i->>'id_variante')::integer)
    into v_count,v_normal from jsonb_array_elements(p_items) i;
  if v_count<>jsonb_array_length(p_items) then raise exception using errcode='22023',message='duplicate_variant'; end if;
  select id_pedido into v_pedido from public.pedido where id_cliente=v_cliente and checkout_key=p_key;
  if found then
    select jsonb_agg(jsonb_build_object('id_variante',id_variante,'cantidad',cantidad) order by id_variante)
      into v_existing from public.pedido_productos where id_pedido=v_pedido;
    if v_existing is distinct from v_normal then raise exception using errcode='23505',message='checkout_key_conflict'; end if;
    return (select jsonb_build_object('id_pedido',id_pedido,'estado',estado,'costo',costo,'reused',true) from public.pedido where id_pedido=v_pedido);
  end if;
  insert into public.pedido(id_cliente,checkout_key) values(v_cliente,p_key) returning id_pedido into v_pedido;
  -- Deterministic order for stock locks; failure rolls back the whole transaction.
  for v_item in select (i->>'id_variante')::integer as id_variante,(i->>'cantidad')::integer as cantidad from jsonb_array_elements(v_normal) i order by 1 loop
    select v.id_producto,v.existencias,v.activo,p.activo as producto_activo,p.precio into v_variant
      from public.producto_variante v join public.producto p on p.id_producto=v.id_producto
      where v.id_variante=v_item.id_variante for update of v,p;
    if not found or not v_variant.activo or not v_variant.producto_activo or v_variant.precio is null or v_variant.existencias<v_item.cantidad then
      raise exception using errcode='23514',message='stock_unavailable';
    end if;
    update public.producto_variante set existencias=existencias-v_item.cantidad where id_variante=v_item.id_variante;
    insert into public.pedido_productos(id_pedido,id_cliente,id_producto,id_variante,cantidad,precio_unitario)
      values(v_pedido,v_cliente,v_variant.id_producto,v_item.id_variante,v_item.cantidad,v_variant.precio);
  end loop;
  return (select jsonb_build_object('id_pedido',id_pedido,'estado',estado,'costo',costo,'reused',false) from public.pedido where id_pedido=v_pedido);
end;
$$;
create function shoefit_private.cambiar_estado_pedido(p_id integer,p_estado text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_role text; v_cliente integer; v_order record; v_item record;
begin
  if v_uid is null then raise exception using errcode='42501',message='forbidden'; end if;
  select u.rolez,c.id_cliente into v_role,v_cliente from public.usuario u left join public.cliente c on c.id_doe=u.id_user where u.auth_id=v_uid;
  if v_role is null or (v_role<>'administrador' and (v_role<>'cliente' or p_estado is distinct from 'cancelado')) then
    raise exception using errcode='42501',message='forbidden';
  end if;
  if p_estado is null or p_estado not in ('cancelado','entregado') or p_id is null or p_id<=0 then raise exception using errcode='22023',message='invalid_state'; end if;
  select id_pedido,id_cliente,estado,checkout_key into v_order from public.pedido where id_pedido=p_id for update;
  if not found or (v_role<>'administrador' and v_order.id_cliente is distinct from v_cliente) then raise exception using errcode='P0002',message='order_not_found'; end if;
  if v_order.estado=p_estado then return jsonb_build_object('id_pedido',p_id,'estado',p_estado,'reused',true); end if;
  if v_order.estado<>'pendiente' then raise exception using errcode='23514',message='invalid_state'; end if;
  if p_estado='cancelado' and v_order.checkout_key is not null then
    for v_item in select id_variante,sum(cantidad)::integer as cantidad from public.pedido_productos where id_pedido=p_id and id_variante is not null group by id_variante order by id_variante loop
      update public.producto_variante set existencias=existencias+v_item.cantidad where id_variante=v_item.id_variante;
    end loop;
  end if;
  update public.pedido set estado=p_estado where id_pedido=p_id;
  return jsonb_build_object('id_pedido',p_id,'estado',p_estado,'reused',false);
end;
$$;
-- Public RPC wrappers do not run with elevated privileges. Private functions
-- enforce the authenticated role and ownership themselves, even if called directly.
create function public.shoefit_crear_pedido(p_key uuid,p_items jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select shoefit_private.crear_pedido(p_key,p_items);
$$;
create function public.shoefit_cambiar_estado_pedido(p_id integer,p_estado text)
returns jsonb language sql security invoker set search_path='' as $$
 select shoefit_private.cambiar_estado_pedido(p_id,p_estado);
$$;
revoke all on function shoefit_private.crear_pedido(uuid,jsonb),shoefit_private.cambiar_estado_pedido(integer,text),public.shoefit_crear_pedido(uuid,jsonb),public.shoefit_cambiar_estado_pedido(integer,text) from public,anon,authenticated;
grant execute on function shoefit_private.crear_pedido(uuid,jsonb),shoefit_private.cambiar_estado_pedido(integer,text),public.shoefit_crear_pedido(uuid,jsonb),public.shoefit_cambiar_estado_pedido(integer,text) to authenticated;
