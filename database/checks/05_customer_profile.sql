do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();adm uuid:=gen_random_uuid();r jsonb;n integer;
begin
 begin
  insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(adm,adm::text||'@test.invalid');
  update public.usuario set rolez='administrador' where auth_id=adm;
  if has_function_privilege('anon','public.shoefit_actualizar_perfil(jsonb)','EXECUTE') then raise exception 'FAIL anonymous profile edit';end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  r:=public.shoefit_actualizar_perfil('{"nombre":" Cliente Prueba ","calle":"Calle A","cp":"01234","talla":25.5}'::jsonb);
  if r->>'nombre'<>'Cliente Prueba' or r->>'cp'<>'01234' or (r->>'talla')::numeric<>25.5 or r->>'rolez'<>'cliente' then raise exception 'FAIL profile values';end if;
  begin perform public.shoefit_actualizar_perfil('{"nombre":"No guardar","cp":"1"}'::jsonb);raise exception 'FAIL invalid postal code';exception when invalid_parameter_value then null;end;
  select count(*) into n from public.usuario where nombre='Cliente Prueba';if n<>1 then raise exception 'FAIL rollback';end if;
  begin perform public.shoefit_actualizar_perfil('{"rolez":"administrador"}'::jsonb);raise exception 'FAIL escalation';exception when invalid_parameter_value then null;end;
  begin perform public.shoefit_actualizar_perfil('{"id_user":1}'::jsonb);raise exception 'FAIL identity injection';exception when invalid_parameter_value then null;end;
  begin perform public.shoefit_actualizar_perfil('{"mail":"other@example.com"}'::jsonb);raise exception 'FAIL email mutation';exception when invalid_parameter_value then null;end;
  r:=public.shoefit_actualizar_perfil('{"calle":null,"talla":null}'::jsonb);
  if r->'calle'<>'null'::jsonb or r->'talla'<>'null'::jsonb or r->>'nombre'<>'Cliente Prueba' then raise exception 'FAIL partial update';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.usuario where nombre='Cliente Prueba';if n<>0 then raise exception 'FAIL cross-user visibility';end if;
  r:=public.shoefit_actualizar_perfil('{"nombre":"Cliente B"}'::jsonb);
  if r->>'mail'<>b::text||'@test.invalid' then raise exception 'FAIL wrong user';end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',adm::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin perform public.shoefit_actualizar_perfil('{"nombre":"Admin"}'::jsonb);raise exception 'FAIL admin uses customer RPC';exception when insufficient_privilege then null;end;
  execute 'reset role';
  raise exception using errcode='P9999',message='PROFILE_OK';
 exception when sqlstate 'P9999' then if sqlerrm<>'PROFILE_OK' then raise;end if;
 end;
end;
$test$;
select 'OK: profile validation, atomic update, immutable role/email, isolation' as resultado,(select count(*) from public.usuario) as usuarios;
