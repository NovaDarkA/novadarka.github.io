-- Validate order details and maintain order totals in the same transaction.
-- Order mutations remain restricted to the trusted service role until F5/F6.
create function shoefit_private.validar_detalle_pedido()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_pedido integer;
  v_estado text;
  v_precio numeric(12,2);
begin
  if tg_op='UPDATE' then
    if new.id_pedido<>old.id_pedido or new.id_cliente<>old.id_cliente then
      raise exception 'No se puede cambiar el pedido o cliente de un detalle' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then v_pedido:=old.id_pedido; else v_pedido:=new.id_pedido; end if;
  select estado into v_estado from public.pedido where id_pedido=v_pedido for update;
  if not found or v_estado<>'pendiente' then
    raise exception 'Solo se pueden modificar detalles de pedidos pendientes' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; end if;
  if tg_op='INSERT' or new.id_producto is distinct from old.id_producto then
    select precio into v_precio from public.producto where id_producto=new.id_producto and activo;
    if not found or v_precio is null then
      raise exception 'Producto sin precio disponible' using errcode='23514';
    end if;
    new.precio_unitario:=v_precio;
  else
    new.precio_unitario:=old.precio_unitario;
  end if;
  return new;
end;
$$;
create function shoefit_private.actualizar_total_pedido()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' then
    update public.pedido set costo=costo+new.costo where id_pedido=new.id_pedido;
    return new;
  elsif tg_op='UPDATE' then
    update public.pedido set costo=costo+new.costo-old.costo where id_pedido=new.id_pedido;
    return new;
  else
    update public.pedido set costo=costo-old.costo where id_pedido=old.id_pedido;
    return old;
  end if;
end;
$$;
create trigger pedido_detalle_validar before insert or update or delete on public.pedido_productos
for each row execute function shoefit_private.validar_detalle_pedido();
create trigger pedido_detalle_total after insert or update or delete on public.pedido_productos
for each row execute function shoefit_private.actualizar_total_pedido();

-- Academic stored procedure: recalculate the total safely from actual details.
-- No client execution permission and no arbitrary input price.
create procedure shoefit_private.recalcular_total_pedido(p_id_pedido integer)
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.pedido where id_pedido=p_id_pedido for update;
  if not found then raise exception 'Pedido no encontrado' using errcode='P0002'; end if;
  update public.pedido p set costo=(
    select coalesce(sum(d.costo),0) from public.pedido_productos d where d.id_pedido=p_id_pedido
  ) where p.id_pedido=p_id_pedido;
end;
$$;
revoke all on function shoefit_private.validar_detalle_pedido() from public,anon,authenticated;
revoke all on function shoefit_private.actualizar_total_pedido() from public,anon,authenticated;
revoke all on procedure shoefit_private.recalcular_total_pedido(integer) from public,anon,authenticated;
grant usage on schema shoefit_private to service_role;
grant execute on function shoefit_private.validar_detalle_pedido(),shoefit_private.actualizar_total_pedido() to service_role;
grant execute on procedure shoefit_private.recalcular_total_pedido(integer) to service_role;
