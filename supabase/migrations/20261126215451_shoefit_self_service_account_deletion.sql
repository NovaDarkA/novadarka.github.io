alter table public.usuario alter column auth_id drop not null;
alter table public.usuario add constraint usuario_auth_required_unless_closed check (auth_id is not null or (rolez='cliente' and nombre='Cuenta eliminada' and mail='cuenta-eliminada-'||id_user::text||'@shoefit.invalid'));
create function shoefit_private.eliminar_cuenta_cliente() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid := auth.uid(); v_user integer; v_client integer;
begin
 if v_uid is null or not exists (
   select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=v_uid
   and s.created_at >= now()-interval '2 minutes' and (s.not_after is null or s.not_after>now())
 ) or not exists (select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a where a->>'method'='password') then
  raise exception 'reauth_required' using errcode='42501';
 end if;
 select u.id_user into v_user from public.usuario u where u.auth_id=v_uid and u.rolez='cliente' for update;
 if v_user is null then raise exception 'forbidden' using errcode='42501'; end if;
 select c.id_cliente into v_client from public.cliente c where c.id_doe=v_user for update;
 if v_client is null then raise exception 'forbidden' using errcode='42501'; end if;
 if exists(select 1 from public.pedido p where p.id_cliente=v_client and p.estado='pendiente') then
  return jsonb_build_object('status','pending_orders');
 end if;
 if exists(select 1 from public.pedido p where p.id_cliente=v_client)
 or exists(select 1 from public.pedido_productos p where p.id_cliente=v_client)
 or exists(select 1 from public.venta v where v.id_cliente=v_client) then
  update public.cliente set calle=null,numero=null,colonia=null,cp=null,talla=null where id_cliente=v_client;
  update public.usuario set auth_id=null,nombre='Cuenta eliminada',ap=null,am=null,img=null,mail='cuenta-eliminada-'||v_user::text||'@shoefit.invalid' where id_user=v_user;
 else
  delete from public.cliente where id_cliente=v_client;
  delete from public.usuario where id_user=v_user;
 end if;
 delete from auth.users where id=v_uid;
 if not found then raise exception 'account_not_found'; end if;
 return jsonb_build_object('status','account_deleted');
end;
$$;
revoke all on function shoefit_private.eliminar_cuenta_cliente() from public,anon,authenticated;
grant execute on function shoefit_private.eliminar_cuenta_cliente() to authenticated;
create function public.shoefit_eliminar_cuenta() returns jsonb
language sql security invoker set search_path='' as $$ select shoefit_private.eliminar_cuenta_cliente(); $$;
revoke all on function public.shoefit_eliminar_cuenta() from public,anon,authenticated;
grant execute on function public.shoefit_eliminar_cuenta() to authenticated;
