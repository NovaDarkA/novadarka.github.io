-- Disposable PostgreSQL only. Exercises the employee access matrix after
-- database/drafts/06_employee_access_hardening.sql has been applied.
do $test$
declare
  emp_a uuid:=gen_random_uuid(); emp_b uuid:=gen_random_uuid();
  cli_a uuid:=gen_random_uuid(); cli_b uuid:=gen_random_uuid(); adm uuid:=gen_random_uuid();
  u_emp_a integer; u_emp_b integer; u_cli_a integer; u_cli_b integer;
  e_emp_a integer; e_emp_b integer; c_cli_a integer; product_id integer; variant_id integer;
  n integer;
begin
 begin
  insert into auth.users(id,email) values
    (emp_a,emp_a::text||'@test.invalid'),(emp_b,emp_b::text||'@test.invalid'),
    (cli_a,cli_a::text||'@test.invalid'),(cli_b,cli_b::text||'@test.invalid'),
    (adm,adm::text||'@test.invalid');
  select id_user into strict u_emp_a from public.usuario where auth_id=emp_a;
  select id_user into strict u_emp_b from public.usuario where auth_id=emp_b;
  select id_user into strict u_cli_a from public.usuario where auth_id=cli_a;
  select id_user into strict u_cli_b from public.usuario where auth_id=cli_b;
  update public.usuario set rolez='administrador' where auth_id=adm;
  insert into public.empleado(id_doe,puesto,salario) values(u_emp_a,'Ventas A',1000) returning id_empleado into e_emp_a;
  insert into public.empleado(id_doe,puesto,salario) values(u_emp_b,'Ventas B',2000) returning id_empleado into e_emp_b;
  select id_cliente into strict c_cli_a from public.cliente where id_doe=u_cli_a;
  insert into public.producto(slug,nom_prod,precio,activo) values('employee-access-test','Employee access test',100,true) returning id_producto into product_id;
  insert into public.producto_variante(id_producto,talla,existencias) values(product_id,25,5) returning id_variante into variant_id;

  -- Employee A: own employee row only, no salary column, no other employee identity/email.
  perform set_config('request.jwt.claim.sub',emp_a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',emp_a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.empleado;
  if n<>1 then raise exception 'FAIL employee sees % employee rows',n; end if;
  if not exists(select 1 from public.empleado where id_doe=u_emp_a) then raise exception 'FAIL own employee row hidden'; end if;
  if exists(select 1 from public.empleado where id_doe=u_emp_b) then raise exception 'FAIL other employee row visible'; end if;
  if has_column_privilege('authenticated','public.empleado','salario','select') then raise exception 'FAIL salary column still selectable'; end if;
  if not has_column_privilege('authenticated','public.empleado','puesto','select') then raise exception 'FAIL safe employee fields not selectable'; end if;
  begin
    execute 'select salario from public.empleado';
    raise exception 'FAIL employee read salary succeeded';
  exception when insufficient_privilege then null; end;
  select count(*) into n from public.usuario where rolez='empleado';
  if n<>1 then raise exception 'FAIL other employee user row visible'; end if;
  select count(*) into n from public.usuario where rolez='cliente';
  if n<>2 then raise exception 'FAIL customer references unavailable to employee'; end if;
  if exists(select 1 from public.usuario where auth_id=adm) then raise exception 'FAIL admin user row visible to employee'; end if;
  select count(*) into n from public.cliente;
  if n<>2 then raise exception 'FAIL employee cannot read only customer references: %',n; end if;
  if exists(select 1 from public.cliente where id_doe in (u_emp_a,u_emp_b)) then raise exception 'FAIL employee-linked client profiles visible'; end if;
  update public.cliente set calle='No autorizado' where id_cliente=c_cli_a;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL employee modified client'; end if;
  delete from public.cliente where id_cliente=c_cli_a;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL employee deleted client'; end if;
  update public.empleado set puesto='No autorizado' where id_empleado=e_emp_a;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL employee modified own staff record'; end if;
  begin
    perform public.shoefit_admin_empleados();
    raise exception 'FAIL employee called administrator employee RPC';
  exception when insufficient_privilege then null; end;
  update public.producto_variante set existencias=4 where id_variante=variant_id;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'FAIL employee inventory operation lost'; end if;
  execute 'reset role';

  -- Administrator retains complete employee management and salary visibility through guarded RPC.
  perform set_config('request.jwt.claim.sub',adm::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  update public.empleado set salario=1500 where id_empleado=e_emp_a;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'FAIL administrator employee salary update'; end if;
  select count(*) into n from public.shoefit_admin_empleados() where salario=1500;
  if n<>1 then raise exception 'FAIL administrator employee salary RPC result'; end if;
  if exists(select 1 from public.shoefit_admin_empleados() where usuario->>'mail' is null) then raise exception 'FAIL admin employee mail projection'; end if;
  execute 'reset role';

  raise exception using errcode='P9999',message='EMPLOYEE_ACCESS_TESTS_PASSED';
 exception when sqlstate 'P9999' then
  if sqlerrm<>'EMPLOYEE_ACCESS_TESTS_PASSED' then raise; end if;
 end;
end;
$test$;
select 'OK: employee own-profile, salary denial, colleague isolation, client read-only and admin employee RPC' as resultado;
