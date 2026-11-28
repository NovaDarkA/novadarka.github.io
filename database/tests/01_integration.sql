-- This script is ONLY for a disposable database with 00_auth_fixture.sql.
-- Each assertion aborts CI on failure; all fictional records are rolled back.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
insert into public.usuario(auth_id,nombre,mail,rolez) values
 ('00000000-0000-4000-8000-000000000001','Cliente A','a@example.invalid','cliente'),
 ('00000000-0000-4000-8000-000000000002','Cliente B','b@example.invalid','cliente'),
 ('00000000-0000-4000-8000-000000000003','Admin prueba','admin@example.invalid','administrador');
insert into public.cliente(id_doe) select id_user from public.usuario where rolez='cliente';
insert into public.pedido(id_cliente) select id_cliente from public.cliente;
insert into public.producto(slug,nom_prod,precio,activo) values ('inactivo-prueba','No público',1,false);
do $$
declare
 c_a integer; c_b integer; p_a integer; prod integer; detalle integer; importe numeric;
begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity)<>8 then raise exception 'RLS no habilitada en ocho tablas';end if;
 if (select count(*) from public.producto where activo)<>4 then raise exception 'Catálogo inicial incorrecto';end if;
 select c.id_cliente into c_a from public.cliente c join public.usuario u on u.id_user=c.id_doe where u.mail='a@example.invalid';
 select c.id_cliente into c_b from public.cliente c join public.usuario u on u.id_user=c.id_doe where u.mail='b@example.invalid';
 select id_pedido into p_a from public.pedido where id_cliente=c_a;
 select id_producto into prod from public.producto where slug='flexible-sneakers-gray';
 insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario) values (p_a,c_a,prod,2,0.01) returning id_pedido_producto into detalle;
 select costo into importe from public.pedido where id_pedido=p_a;
 if importe<>4980 then raise exception 'Precio autoritativo/trigger insert incorrecto: %',importe;end if;
 update public.pedido_productos set cantidad=3 where id_pedido_producto=detalle;
 if (select costo from public.pedido where id_pedido=p_a)<>7470 then raise exception 'Trigger update incorrecto';end if;
 begin
   insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario) values (p_a,c_b,prod,1,0);
   raise exception 'Se aceptó otro cliente';
 exception when foreign_key_violation then null;end;
 begin
   update public.pedido_productos set precio_unitario=1 where id_pedido_producto=detalle;
   raise exception 'Se aceptó precio manipulado';
 exception when check_violation then null;end;
 delete from public.pedido_productos where id_pedido_producto=detalle;
 if (select costo from public.pedido where id_pedido=p_a)<>0 then raise exception 'Trigger delete incorrecto';end if;
 insert into public.pedido_productos(id_pedido,id_cliente,id_producto,cantidad,precio_unitario) values (p_a,c_a,prod,1,0);
 update public.pedido set costo=0 where id_pedido=p_a;
 call public.recalcular_total_pedido(p_a);
 if (select costo from public.pedido where id_pedido=p_a)<>2490 then raise exception 'Procedimiento incorrecto';end if;
 update public.pedido set estado='entregado' where id_pedido=p_a;
 begin
   update public.pedido_productos set cantidad=2 where id_pedido=p_a;
   raise exception 'Se modificó pedido cerrado';
 exception when check_violation then null;end;
end $$;

set local role anon;
do $$ begin
 if (select count(*) from public.producto)<>4 then raise exception 'Catálogo público incorrecto';end if;
 if has_table_privilege(current_user,'public.usuario','select') then raise exception 'Anon accede a usuario';end if;
 if has_table_privilege(current_user,'public.producto','insert') then raise exception 'Anon escribe producto';end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.usuario)<>1 or (select count(*) from public.cliente)<>1 or (select count(*) from public.pedido)<>1 or (select count(*) from public.pedidos_con_detalle)<>1 then raise exception 'RLS de cliente A incorrecta';end if;
 if exists (select 1 from public.usuario where mail<>'a@example.invalid') then raise exception 'Datos ajenos visibles';end if;
 if has_column_privilege(current_user,'public.usuario','rolez','update') then raise exception 'Escalada de rol';end if;
 if has_function_privilege(current_user,'public.recalcular_total_pedido(integer)','execute') then raise exception 'Procedimiento expuesto';end if;
 begin
  insert into public.producto(slug,nom_prod) values ('no-admin','No admin');
  raise exception 'Cliente insertó producto';
 exception when insufficient_privilege then null;end;
 update public.producto set precio=1 where slug='flexible-sneakers-gray';
 if found then raise exception 'Cliente modificó producto';end if;
 delete from public.producto where slug='sport-orange-white';
 if found then raise exception 'Cliente eliminó producto';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.pedido)<>1 or (select count(*) from public.pedidos_con_detalle)<>0 then raise exception 'Cliente B ve datos ajenos';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$
declare prov integer; prod integer;
begin
 if (select count(*) from public.cliente)<>2 or (select count(*) from public.pedido)<>2 then raise exception 'Admin sin acceso a clientes/pedidos';end if;
 insert into public.proveedor(marca,tipo_producto) values ('Proveedor prueba','Calzado') returning id_proveedor into prov;
 insert into public.producto(slug,nom_prod,id_proveedor,precio) values ('producto-prueba','Producto prueba',prov,100) returning id_producto into prod;
 update public.producto set precio=120 where id_producto=prod;
 if not found or (select precio from public.producto where id_producto=prod)<>120 then raise exception 'CRUD producto update';end if;
 update public.proveedor set marca='Proveedor actualizado' where id_proveedor=prov;
 if not found or not exists(select 1 from public.catalogo_con_proveedor where id_producto=prod and marca_proveedor='Proveedor actualizado') then raise exception 'CRUD proveedor/JOIN';end if;
 delete from public.producto where id_producto=prod;
 if not found then raise exception 'CRUD producto delete';end if;
 delete from public.proveedor where id_proveedor=prov;
 if not found then raise exception 'CRUD proveedor delete';end if;
end $$;
reset role;
rollback;
select 'F3 SQL: constraints, catalog, JOIN, triggers, procedure, two-table CRUD and RLS checks passed' as resultado;
