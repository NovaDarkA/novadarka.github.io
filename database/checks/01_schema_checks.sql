-- Read-only catalog checks; run after applying the reviewed schema to Shoefit.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in
('usuario','empleado','proveedor','cliente','producto','pedido','pedido_productos','venta')
order by table_name;

select c.relname as tabla,c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname in
('usuario','empleado','proveedor','cliente','producto','pedido','pedido_productos','venta')
order by c.relname;

select table_name,grantee,privilege_type
from information_schema.role_table_grants where table_schema='public'
and grantee in ('anon','authenticated') and table_name in
('usuario','empleado','proveedor','cliente','producto','pedido','pedido_productos','venta')
order by table_name,grantee,privilege_type;

select conrelid::regclass as tabla, conname, pg_get_constraintdef(oid) as restriccion
from pg_constraint where connamespace='public'::regnamespace
and conrelid::regclass::text in
('usuario','empleado','proveedor','cliente','producto','pedido','pedido_productos','venta')
order by tabla,conname;
