-- Shoefit: catalog, administrator authorization and relational reads.
alter table public.producto add column color text;

-- Source: four unique product references already present in frontend/assets/js/products.js.
-- Unconfirmed sizes, supplier and missing price stay NULL.
insert into public.producto (slug,nom_prod,marca,tipo_prod,color,img,precio,activo) values
('flexible-sneakers-gray','Flexible Sneakers for men',null,'Sneakers','Gray','img/optimized/tenis-gris-lateral-619.webp',2490,true),
('sport-orange-white','Sport Shoes special brand orange and white',null,'Sport Shoes','Orange / White','img/optimized/producto-tenis-naranja-360.webp',3450,true),
('martin-dingman-brown','Martin Dingman Brown For Men 123456','Martin Dingman','Casual Shoes','Brown','img/optimized/producto-oxford-cafe-604.webp',4000,true),
('casual-boots-brown','Casual Boots Martin O''Neil Brown','Martin O''Neil','Casual Boots','Brown','img/optimized/botas-cafe-casual-268.webp',null,true);

-- Authorization uses the database role, never user-editable JWT metadata.
-- Private schema is not exposed in the public Data API.
create schema if not exists shoefit_private;
revoke all on schema shoefit_private from public,anon,authenticated;
grant usage on schema shoefit_private to authenticated;
create function shoefit_private.es_administrador()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.usuario u
                where u.auth_id=(select auth.uid()) and u.rolez='administrador');
$$;
revoke all on function shoefit_private.es_administrador() from public,anon,authenticated;
grant execute on function shoefit_private.es_administrador() to authenticated;

-- Explicit grants plus RLS: only admins may modify the four dashboard modules.
-- No public/admin grant to alter usuario.rolez; provisioning roles is a trusted backend task.
create policy usuario_admin_select on public.usuario for select to authenticated
using ((select shoefit_private.es_administrador()));

grant select,insert,update,delete on public.producto,public.proveedor,public.cliente,
  public.empleado,public.venta to authenticated;
grant usage,select on sequence public.producto_id_producto_seq,public.proveedor_id_proveedor_seq,
  public.cliente_id_cliente_seq,public.empleado_id_empleado_seq,public.venta_id_venta_seq to authenticated;

create policy producto_admin on public.producto for all to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy proveedor_admin on public.proveedor for all to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy cliente_admin on public.cliente for all to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy empleado_admin on public.empleado for all to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy venta_admin on public.venta for all to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));

-- Privileged backend access is explicit; service role keys must never be public.
grant select,insert,update,delete on public.usuario,public.empleado,public.proveedor,
  public.cliente,public.producto,public.pedido,public.pedido_productos,public.venta to service_role;
grant usage,select on sequence public.usuario_id_user_seq,public.empleado_id_empleado_seq,
  public.proveedor_id_proveedor_seq,public.cliente_id_cliente_seq,public.producto_id_producto_seq,
  public.pedido_id_pedido_seq,public.pedido_productos_id_pedido_producto_seq,public.venta_id_venta_seq to service_role;

-- Invoker views preserve base-table RLS.
create view public.v_pedido_detalle with (security_invoker=true) as
select p.id_pedido,p.id_cliente,p.estado,p.costo as total_pedido,p.creado_en,
       d.id_pedido_producto,d.id_producto,d.cantidad,d.precio_unitario,d.costo as subtotal,
       pr.nom_prod,pr.slug
from public.pedido p
join public.pedido_productos d on d.id_pedido=p.id_pedido and d.id_cliente=p.id_cliente
left join public.producto pr on pr.id_producto=d.id_producto;

create view public.v_catalogo_proveedor with (security_invoker=true) as
select p.id_producto,p.slug,p.nom_prod,p.marca,p.talla,p.precio,p.tipo_prod,p.color,p.img,p.activo,
       p.id_proveedor,pr.marca as marca_proveedor,pr.tipo_producto as tipo_proveedor
from public.producto p
left join public.proveedor pr on pr.id_proveedor=p.id_proveedor;

revoke all on public.v_pedido_detalle,public.v_catalogo_proveedor from public,anon,authenticated;
grant select on public.v_pedido_detalle,public.v_catalogo_proveedor to authenticated,service_role;
