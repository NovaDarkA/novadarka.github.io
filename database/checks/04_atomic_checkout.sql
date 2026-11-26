-- All fixtures rolled back; run only in the dedicated development database.
do $test$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); adm uuid:=gen_random_uuid();
 k uuid:=gen_random_uuid(); k2 uuid:=gen_random_uuid(); p integer; v1 integer; v2 integer; o integer; o2 integer;
 j jsonb; result jsonb; n integer; amount numeric;
begin
 begin
  insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(adm,adm::text||'@test.invalid');
  update public.usuario set rolez='administrador' where auth_id=adm;
  insert into public.producto(nom_prod,slug,precio,activo) values('Test Checkout','test-checkout-'||a::text,125,true) returning id_producto into p;
  insert into public.producto_variante(id_producto,talla,existencias) values(p,25,5) returning id_variante into v1;
  insert into public.producto_variante(id_producto,talla,existencias) values(p,26,1) returning id_variante into v2;
  j:=jsonb_build_array(jsonb_build_object('id_variante',v1,'cantidad',2));
  if has_function_privilege('anon','public.shoefit_crear_pedido(uuid,jsonb)','EXECUTE') then raise exception 'FAIL anonymous checkout'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.shoefit_crear_pedido(k,j); o:=(result->>'id_pedido')::integer;
  if (result->>'costo')::numeric<>250 or result->>'estado'<>'pendiente' or (result->>'reused')::boolean then raise exception 'FAIL checkout total'; end if;
  select existencias into n from public.producto_variante where id_variante=v1;
  if n<>3 then raise exception 'FAIL stock decrement'; end if;
  result:=public.shoefit_crear_pedido(k,j);
  if not (result->>'reused')::boolean or (result->>'id_pedido')::integer<>o then raise exception 'FAIL idempotent replay'; end if;
  select existencias into n from public.producto_variante where id_variante=v1;
  if n<>3 then raise exception 'FAIL duplicate reservation'; end if;
  begin
   perform public.shoefit_crear_pedido(k,jsonb_build_array(jsonb_build_object('id_variante',v1,'cantidad',1)));
   raise exception 'FAIL key reused with different items';
  exception when unique_violation then null; end;
  begin
   perform public.shoefit_crear_pedido(k2,jsonb_build_array(jsonb_build_object('id_variante',v1,'cantidad',1),jsonb_build_object('id_variante',v2,'cantidad',2)));
   raise exception 'FAIL insufficient stock';
  exception when check_violation then null; end;
  select existencias into n from public.producto_variante where id_variante=v1;
  if n<>3 then raise exception 'FAIL partial stock rollback'; end if;
  select count(*) into n from public.pedido where checkout_key=k2;
  if n<>0 then raise exception 'FAIL partial order rollback'; end if;
  begin
   perform public.shoefit_crear_pedido(k2,jsonb_build_array(jsonb_build_object('id_variante',v1,'cantidad',1,'precio',1)));
   raise exception 'FAIL custom price';
  exception when invalid_parameter_value then null; end;
  begin
   perform public.shoefit_crear_pedido(k2,j||j);
   raise exception 'FAIL duplicate variant';
  exception when invalid_parameter_value then null; end;
  begin
   perform public.shoefit_cambiar_estado_pedido(o,'entregado');
   raise exception 'FAIL client delivery';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
   perform public.shoefit_cambiar_estado_pedido(o,'cancelado');
   raise exception 'FAIL cross-user cancellation';
  exception when no_data_found then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.shoefit_cambiar_estado_pedido(o,'cancelado');
  if result->>'estado'<>'cancelado' then raise exception 'FAIL cancel state'; end if;
  perform public.shoefit_cambiar_estado_pedido(o,'cancelado');
  select existencias into n from public.producto_variante where id_variante=v1;
  if n<>5 then raise exception 'FAIL cancellation stock exactly once'; end if;
  result:=public.shoefit_crear_pedido(k2,jsonb_build_array(jsonb_build_object('id_variante',v2,'cantidad',1)));o2:=(result->>'id_pedido')::integer;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',adm::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result:=public.shoefit_cambiar_estado_pedido(o2,'entregado');
  if result->>'estado'<>'entregado' then raise exception 'FAIL admin delivery'; end if;
  begin
   perform public.shoefit_cambiar_estado_pedido(o2,'cancelado');
   raise exception 'FAIL delivered order cancellation';
  exception when check_violation then null; end;
  select existencias into n from public.producto_variante where id_variante=v2;
  if n<>0 then raise exception 'FAIL delivery stock'; end if;
  begin
   perform public.shoefit_crear_pedido(gen_random_uuid(),j);
   raise exception 'FAIL admin checkout';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  raise exception using errcode='P9999',message='CHECKOUT_TEST_OK';
 exception when sqlstate 'P9999' then
  if sqlerrm<>'CHECKOUT_TEST_OK' then raise;end if;
 end;
end;
$test$;
select 'OK: checkout, rollback, idempotency, ownership, cancellation, delivery' as resultado,
(select count(*) from public.pedido) as pedidos,(select count(*) from public.producto_variante) as variantes;
