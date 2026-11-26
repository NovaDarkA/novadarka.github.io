-- Dedicated test database only. All temporary records are rolled back.
do $test$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); adm uuid:=gen_random_uuid();
 ua integer; ub integer; ue integer; uadm integer; ca integer; cb integer; emp integer; sale integer;
 prod integer; variant integer; n integer;
begin
 begin
  insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(e,e::text||'@test.invalid'),(adm,adm::text||'@test.invalid');
  insert into public.usuario(auth_id,nombre,mail) values(a,'Test A',a::text||'@test.invalid') returning id_user into ua;
  insert into public.usuario(auth_id,nombre,mail) values(b,'Test B',b::text||'@test.invalid') returning id_user into ub;
  insert into public.usuario(auth_id,nombre,mail,rolez) values(e,'Test Employee',e::text||'@test.invalid','empleado') returning id_user into ue;
  insert into public.usuario(auth_id,nombre,mail,rolez) values(adm,'Test Admin',adm::text||'@test.invalid','administrador') returning id_user into uadm;
  select id_producto into strict prod from public.producto where slug='flexible-sneakers-gray';
  perform set_config('request.jwt.claim.sub',adm::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.cliente(id_doe,calle,cp) values(ua,'Test','00000') returning id_cliente into ca;
  insert into public.cliente(id_doe) values(ub) returning id_cliente into cb;
  insert into public.empleado(id_doe,puesto,salario) values(ue,'Test',100) returning id_empleado into emp;
  insert into public.venta(id_cliente,id_empleado,id_producto,cantidad_pares,costo_de_venta) values(ca,emp,prod,1,2490) returning id_venta into sale;
  insert into public.producto_variante(id_producto,talla,existencias) values(prod,25,3) returning id_variante into variant;
  update public.cliente set calle='Edited' where id_cliente=ca;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL client update'; end if;
  update public.empleado set salario=200 where id_empleado=emp;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL employee update'; end if;
  update public.venta set cantidad_pares=2,costo_de_venta=4980 where id_venta=sale;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL sale update'; end if;
  update public.producto_variante set existencias=2 where id_variante=variant;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL stock update'; end if;
  begin
    update public.producto_variante set existencias=-1 where id_variante=variant;
    raise exception 'FAIL negative stock accepted';
  exception when check_violation then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.cliente;
  if n<>1 then raise exception 'FAIL client isolation'; end if;
  select count(*) into n from public.venta;
  if n<>0 then raise exception 'FAIL sale leak'; end if;
  select count(*) into n from public.empleado;
  if n<>0 then raise exception 'FAIL employee leak'; end if;
  update public.cliente set calle='Unauthorized' where id_cliente=cb;
  get diagnostics n=row_count; if n<>0 then raise exception 'FAIL client modification'; end if;
  update public.producto_variante set existencias=999 where id_variante=variant;
  get diagnostics n=row_count; if n<>0 then raise exception 'FAIL stock modification'; end if;
  execute 'reset role';
  execute 'set local role anon';
  select count(*) into n from public.producto_variante where id_variante=variant and existencias=2;
  if n<>1 then raise exception 'FAIL public inventory'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',adm::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  delete from public.venta where id_venta=sale;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL sale delete'; end if;
  delete from public.empleado where id_empleado=emp;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL employee delete'; end if;
  delete from public.cliente where id_cliente in(ca,cb);
  get diagnostics n=row_count; if n<>2 then raise exception 'FAIL client delete'; end if;
  delete from public.producto_variante where id_variante=variant;
  get diagnostics n=row_count; if n<>1 then raise exception 'FAIL variant delete'; end if;
  execute 'reset role';
  raise exception using errcode='P9999',message='SHOEFIT_ADMIN_TEST_OK';
 exception when sqlstate 'P9999' then
  if sqlerrm<>'SHOEFIT_ADMIN_TEST_OK' then raise; end if;
 end;
end;
$test$;
select 'OK: administration and stock assertions; fixtures rolled back' as resultado,
(select count(*) from public.usuario) as usuarios,(select count(*) from public.venta) as ventas,
(select count(*) from public.producto_variante) as variantes;
