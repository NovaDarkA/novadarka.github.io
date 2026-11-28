-- Product size/stock catalog: no fabricated stock. Empty until sizes are known.
create table public.producto_variante (
  id_variante integer generated always as identity primary key,
  id_producto integer not null references public.producto(id_producto) on delete restrict,
  talla numeric(4,1) not null check (talla>0),
  existencias integer not null default 0 check (existencias>=0),
  activo boolean not null default true,
  unique(id_producto,talla),
  unique(id_producto,id_variante)
);
alter table public.producto_variante enable row level security;
revoke all on public.producto_variante from public,anon,authenticated;
grant select on public.producto_variante to anon,authenticated;
grant insert,update,delete on public.producto_variante to authenticated,service_role;
grant select on public.producto_variante to service_role;
grant usage,select on sequence public.producto_variante_id_variante_seq to authenticated,service_role;
create policy variante_publica on public.producto_variante for select to anon
using (activo and exists(select 1 from public.producto p where p.id_producto=producto_variante.id_producto and p.activo));
create policy variante_autenticada on public.producto_variante for select to authenticated
using ((select shoefit_private.es_administrador()) or
  (activo and exists(select 1 from public.producto p where p.id_producto=producto_variante.id_producto and p.activo)));
create policy variante_admin_insert on public.producto_variante for insert to authenticated
with check ((select shoefit_private.es_administrador()));
create policy variante_admin_update on public.producto_variante for update to authenticated
using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy variante_admin_delete on public.producto_variante for delete to authenticated
using ((select shoefit_private.es_administrador()));

-- Existing academic details still valid; checkout implementation must require a
-- variant and perform stock reservation atomically before exposing order writes.
alter table public.pedido_productos add column id_variante integer;
alter table public.pedido_productos add constraint pedido_detalle_variante_fk
foreign key(id_producto,id_variante) references public.producto_variante(id_producto,id_variante) on delete restrict;
create index pedido_detalle_variante_idx on public.pedido_productos(id_producto,id_variante);
comment on table public.producto_variante is 'Configured sizes and actual available stock. Empty inventory means availability unconfirmed.';
comment on column public.pedido_productos.id_variante is 'Nullable for legacy/manual records. Checkout must validate variant and reserve stock atomically.';
