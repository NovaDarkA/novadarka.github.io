create function shoefit_private.es_empleado() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuario u join public.empleado e on e.id_doe=u.id_user where u.auth_id=(select auth.uid()) and u.rolez='empleado');
$$;
revoke all on function shoefit_private.es_empleado() from public,anon,authenticated;
grant execute on function shoefit_private.es_empleado() to authenticated;
create policy empleado_consulta_personal on public.empleado for select to authenticated using ((select shoefit_private.es_empleado()));
create policy usuario_consulta_personal on public.usuario for select to authenticated using ((select shoefit_private.es_empleado()));
do $$ declare t text; begin
 foreach t in array array['producto','producto_variante','proveedor','cliente','venta'] loop
 execute format('create policy personal_operacion on public.%I for all to authenticated using ((select shoefit_private.es_empleado())) with check ((select shoefit_private.es_empleado()))',t);
 end loop;
end $$;
create function shoefit_private.sincronizar_rol_empleado() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op in ('DELETE','UPDATE') then
   if tg_op='DELETE' or old.id_doe is distinct from new.id_doe then
     update public.usuario u set rolez='cliente' where u.id_user=old.id_doe and u.rolez='empleado' and not exists(select 1 from public.empleado e where e.id_doe=u.id_user);
   end if;
 end if;
 if tg_op in ('INSERT','UPDATE') then
   update public.usuario set rolez='empleado' where id_user=new.id_doe and rolez='cliente';
 end if;
 return null;
end $$;
revoke all on function shoefit_private.sincronizar_rol_empleado() from public,anon,authenticated;
create trigger sincronizar_rol_empleado after insert or delete or update of id_doe on public.empleado for each row execute function shoefit_private.sincronizar_rol_empleado();
update public.usuario u set rolez='empleado' where u.rolez='cliente' and exists(select 1 from public.empleado e where e.id_doe=u.id_user);
create or replace function shoefit_private.cambiar_estado_pedido(p_id integer,p_estado text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_role text; v_cliente integer; v_order record; v_item record; v_staff boolean;
begin
 if v_uid is null then raise exception using errcode='42501',message='forbidden'; end if;
 select u.rolez,c.id_cliente into v_role,v_cliente from public.usuario u left join public.cliente c on c.id_doe=u.id_user where u.auth_id=v_uid;
 v_staff:=coalesce(v_role='administrador',false) or shoefit_private.es_empleado();
 if not v_staff and (v_role is distinct from 'cliente' or p_estado is distinct from 'cancelado') then raise exception using errcode='42501',message='forbidden'; end if;
 if p_estado is null or p_estado not in ('cancelado','entregado') or p_id is null or p_id<=0 then raise exception using errcode='22023',message='invalid_state'; end if;
 select id_pedido,id_cliente,estado,checkout_key into v_order from public.pedido where id_pedido=p_id for update;
 if not found or (not v_staff and v_order.id_cliente is distinct from v_cliente) then raise exception using errcode='P0002',message='order_not_found'; end if;
 if v_order.estado=p_estado then return jsonb_build_object('id_pedido',p_id,'estado',p_estado,'reused',true); end if;
 if v_order.estado<>'pendiente' then raise exception using errcode='23514',message='invalid_state'; end if;
 if p_estado='cancelado' and v_order.checkout_key is not null then
   for v_item in select id_variante,sum(cantidad)::integer as cantidad from public.pedido_productos where id_pedido=p_id and id_variante is not null group by id_variante order by id_variante loop
     update public.producto_variante set existencias=existencias+v_item.cantidad where id_variante=v_item.id_variante;
   end loop;
 end if;
 update public.pedido set estado=p_estado where id_pedido=p_id;
 return jsonb_build_object('id_pedido',p_id,'estado',p_estado,'reused',false);
end $$;
notify pgrst,'reload schema';
