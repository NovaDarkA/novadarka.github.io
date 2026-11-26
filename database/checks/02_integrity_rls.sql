-- Transaction-only fixtures; no persistent accounts, emails, products or orders.
-- Run in the dedicated Shoefit database with a privileged SQL runner.
do $test$
declare
  a uuid:=gen_random_uuid();
  b uuid:=gen_random_uuid();
  adm uuid:=gen_random_uuid();
  ua integer; ub integer; uadm integer;
  ca integer; cb integer;
  po integer; po2 integer; line_id integer;
  prod integer; missing_price integer; demo_prod integer; demo_provider integer;
  n integer;
  amount numeric;
begin
  begin
    insert into auth.users(id,email) values
      (a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(adm,adm::text||'@test.invalid');
    insert into public.usuario(auth_id,nombre,mail) values(a,'Test A',a::text||'@test.invalid') returning id_user into ua;
    insert into public.usuario(auth_id,nombre,mail) values(b,'Test B',b::text||'@test.invalid') returning id_user into ub;
    insert into public.usuario(auth_id,nombre,mail,rolez) values(adm,'Test Admin',adm::text||'@test.invalid','administrador') returning id_user into uadm;
    insert into public.cliente(id_doe) values(ua) returning id_cliente into ca;
    insert into public.cliente(id_doe) values(ub) returning id_cliente into cb;
    insert into public.pedido(id_cliente) values(ca) returning id_pedido into po;
    insert into public.pedido(id_cliente) values(cb) returning id_pedido into po2;
    select id_producto into strict prod from public.producto where slug='flexible-sneakers-gray';
    select id_producto into strict missing_price from public.producto where slug='casual-boots-brown';

    insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario)
      values(po,ca,prod,2,1) returning id_pedido_producto into line_id;
    select costo into amount from public.pedido where id_pedido=po;
    if amount<>4980 then raise exception 'FAIL insert total %',amount; end if;
    select precio_unitario into amount from public.pedido_productos where id_pedido_producto=line_id;
    if amount<>2490 then raise exception 'FAIL price snapshot %',amount; end if;
    update public.pedido_productos set cantidad=3,precio_unitario=1 where id_pedido_producto=line_id;
    select costo into amount from public.pedido where id_pedido=po;
    if amount<>7470 then raise exception 'FAIL update total %',amount; end if;
    begin
      insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario)
        values(po,cb,prod,1,1);
      raise exception 'FAIL mismatched client accepted';
    exception when foreign_key_violation then null; end;
    begin
      insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario)
        values(po,ca,missing_price,1,1);
      raise exception 'FAIL unknown price accepted';
    exception when check_violation then null; end;
    update public.pedido set costo=1 where id_pedido=po;
    call shoefit_private.recalcular_total_pedido(po);
    select costo into amount from public.pedido where id_pedido=po;
    if amount<>7470 then raise exception 'FAIL procedure total %',amount; end if;
    select count(*) into n from public.v_pedido_detalle where id_pedido=po and subtotal=7470;
    if n<>1 then raise exception 'FAIL joined order'; end if;

    -- Anonymous public catalog and no private privileges.
    execute 'set local role anon';
    select count(*) into n from public.producto;
    if n<>4 then raise exception 'FAIL anon catalog %',n; end if;
    if has_table_privilege(current_user,'public.usuario','SELECT') or
       has_table_privilege(current_user,'public.producto','INSERT') then
      raise exception 'FAIL anonymous privileges';
    end if;
    execute 'reset role';

    -- Authenticated customer sees only own records; no administrative writes.
    perform set_config('request.jwt.claim.sub',a::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if shoefit_private.es_administrador() then raise exception 'FAIL customer administrator'; end if;
    select count(*) into n from public.usuario;
    if n<>1 then raise exception 'FAIL own profile %',n; end if;
    select count(*) into n from public.pedido;
    if n<>1 then raise exception 'FAIL own orders %',n; end if;
    select count(*) into n from public.pedido_productos;
    if n<>1 then raise exception 'FAIL own details %',n; end if;
    select count(*) into n from public.v_pedido_detalle;
    if n<>1 then raise exception 'FAIL join RLS %',n; end if;
    select count(*) into n from public.empleado;
    if n<>0 then raise exception 'FAIL employee leak'; end if;
    begin
      insert into public.producto(slug,nom_prod) values('test-denied-'||a::text,'Denied');
      raise exception 'FAIL customer insert accepted';
    exception when insufficient_privilege then null; end;
    update public.producto set precio=1 where id_producto=prod;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'FAIL customer update accepted'; end if;
    begin
      update public.usuario set rolez='administrador' where auth_id=a;
      raise exception 'FAIL escalation accepted';
    exception when insufficient_privilege then null; end;
    execute 'reset role';

    -- Administrator CRUD across two tables, including foreign-key relationship.
    perform set_config('request.jwt.claim.sub',adm::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if not shoefit_private.es_administrador() then raise exception 'FAIL admin lookup'; end if;
    insert into public.proveedor(marca,tipo_producto) values('Test Provider','Test') returning id_proveedor into demo_provider;
    insert into public.producto(slug,nom_prod,id_proveedor,precio) values('test-admin-'||adm::text,'Test Product',demo_provider,10) returning id_producto into demo_prod;
    update public.proveedor set marca='Edited Provider' where id_proveedor=demo_provider;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'FAIL provider update'; end if;
    update public.producto set precio=20 where id_producto=demo_prod;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'FAIL product update'; end if;
    select count(*) into n from public.v_catalogo_proveedor where id_producto=demo_prod and marca_proveedor='Edited Provider' and precio=20;
    if n<>1 then raise exception 'FAIL product/provider join'; end if;
    delete from public.producto where id_producto=demo_prod;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'FAIL product delete'; end if;
    delete from public.proveedor where id_proveedor=demo_provider;
    get diagnostics n=row_count;
    if n<>1 then raise exception 'FAIL provider delete'; end if;
    execute 'reset role';

    delete from public.pedido_productos where id_pedido_producto=line_id;
    select costo into amount from public.pedido where id_pedido=po;
    if amount<>0 then raise exception 'FAIL delete total %',amount; end if;

    -- Roll back ALL fixtures by intentionally aborting this subtransaction.
    raise exception using errcode='P9999',message='SHOEFIT_TESTS_PASSED_ROLLBACK';
  exception when sqlstate 'P9999' then
    if sqlerrm<>'SHOEFIT_TESTS_PASSED_ROLLBACK' then raise; end if;
  end;
end;
$test$;
select 'OK: SQL assertions completed and fixtures rolled back' as resultado,
       (select count(*) from public.producto) as productos,
       (select count(*) from public.usuario) as usuarios,
       (select count(*) from public.pedido) as pedidos,
       (select count(*) from public.proveedor) as proveedores;
