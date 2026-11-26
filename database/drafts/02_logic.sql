-- F3 draft, apply after 01_schema.sql only to an isolated Shoefit database.
begin;
-- One usuario table. rolez is the authoritative role; customers cannot change it.
alter table public.producto add column color varchar(100);
grant select,insert,update,delete on public.usuario,public.empleado,public.proveedor,public.cliente,
 public.producto,public.pedido,public.pedido_productos,public.venta to service_role;

-- The policy on usuario is own-read only; admin checks on other tables read
-- the caller's own role. No recursive usuario policy, no SECURITY DEFINER.
grant select,insert,update,delete on public.producto,public.proveedor,public.cliente,public.empleado,public.venta to authenticated;
create policy producto_admin on public.producto for all to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'))
 with check (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy proveedor_admin on public.proveedor for all to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'))
 with check (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy cliente_admin on public.cliente for all to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'))
 with check (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy empleado_admin on public.empleado for all to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'))
 with check (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy venta_admin on public.venta for all to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'))
 with check (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy pedido_admin_lectura on public.pedido for select to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));
create policy detalle_admin_lectura on public.pedido_productos for select to authenticated
 using (exists (select 1 from public.usuario u where u.auth_id=(select auth.uid()) and u.rolez='administrador'));

-- Views honor the caller's RLS policies, including those on joined tables.
create view public.catalogo_con_proveedor with (security_invoker=true) as
 select p.id_producto,p.slug,p.nom_prod,p.marca,p.color,p.talla,p.precio,p.tipo_prod,p.img,p.activo,
        v.marca as marca_proveedor,v.tipo_producto as tipo_proveedor
 from public.producto p left join public.proveedor v on v.id_proveedor=p.id_proveedor;
create view public.pedidos_con_detalle with (security_invoker=true) as
 select p.id_pedido,p.id_cliente,p.estado,p.creado_en,p.costo as total,
        d.id_pedido_producto,d.id_producto,d.cantidad,d.precio_unitario,d.costo as subtotal,
        pr.nom_prod
 from public.pedido p join public.pedido_productos d
 on d.id_pedido=p.id_pedido and d.id_cliente=p.id_cliente
 left join public.producto pr on pr.id_producto=d.id_producto;
revoke all on public.catalogo_con_proveedor,public.pedidos_con_detalle from public,anon,authenticated;
grant select on public.catalogo_con_proveedor,public.pedidos_con_detalle to authenticated,service_role;

create schema shoefit_private;
revoke all on schema shoefit_private from public,anon,authenticated;
grant usage on schema shoefit_private to service_role;

-- Serialize modifications of each order and prevent modification of closed orders.
-- The price is captured from the database, not accepted from the client.
create function shoefit_private.validar_detalle() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
 target_pedido integer;
 target_cliente integer;
 estado_actual text;
 precio_actual numeric(12,2);
begin
 if tg_op='UPDATE' then
   if (new.id_pedido,new.id_cliente,new.id_producto,new.id_pedido_producto)
      is distinct from (old.id_pedido,old.id_cliente,old.id_producto,old.id_pedido_producto)
      or new.precio_unitario is distinct from old.precio_unitario then
      raise exception 'La identidad y el precio de un detalle son inmutables' using errcode='23514';
   end if;
 end if;
 if tg_op='DELETE' then target_pedido:=old.id_pedido;target_cliente:=old.id_cliente;
 else target_pedido:=new.id_pedido;target_cliente:=new.id_cliente;end if;
 select p.estado into estado_actual from public.pedido p
 where p.id_pedido=target_pedido and p.id_cliente=target_cliente for update;
 if not found then raise exception 'Pedido y cliente no coinciden' using errcode='23503';end if;
 if estado_actual<>'pendiente' then raise exception 'El pedido no admite cambios' using errcode='23514';end if;
 if tg_op='INSERT' then
   select p.precio into precio_actual from public.producto p
   where p.id_producto=new.id_producto and p.activo and p.precio is not null for share;
   if not found then raise exception 'Producto sin precio activo' using errcode='23514';end if;
   new.precio_unitario:=precio_actual;
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end;
$$;
create function shoefit_private.actualizar_total() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
   update public.pedido set costo=costo+new.costo where id_pedido=new.id_pedido;
 elsif tg_op='UPDATE' then
   update public.pedido set costo=costo-old.costo+new.costo where id_pedido=new.id_pedido;
 else
   update public.pedido set costo=costo-old.costo where id_pedido=old.id_pedido;
 end if;
 return null;
end;
$$;
revoke all on function shoefit_private.validar_detalle(),shoefit_private.actualizar_total() from public,anon,authenticated;
grant execute on function shoefit_private.validar_detalle(),shoefit_private.actualizar_total() to service_role;
create trigger detalle_validacion before insert or update or delete on public.pedido_productos
 for each row execute function shoefit_private.validar_detalle();
create trigger detalle_total after insert or update or delete on public.pedido_productos
 for each row execute function shoefit_private.actualizar_total();

-- True PostgreSQL stored procedure, callable only by trusted server/DB role.
-- Recalculate an existing order from its generated detail subtotals.
create procedure public.recalcular_total_pedido(in p_pedido integer)
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.pedido where id_pedido=p_pedido for update;
 if not found then raise exception 'Pedido inexistente' using errcode='P0002';end if;
 update public.pedido
 set costo=(select coalesce(sum(d.costo),0) from public.pedido_productos d where d.id_pedido=p_pedido)
 where id_pedido=p_pedido;
end;
$$;
revoke all on procedure public.recalcular_total_pedido(integer) from public,anon,authenticated;
grant execute on procedure public.recalcular_total_pedido(integer) to service_role;
commit;
