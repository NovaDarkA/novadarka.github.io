begin;
lock table public.producto,public.producto_variante in access exclusive mode;
do $$ begin if exists(select 1 from public.producto where talla is not null) then raise exception 'Legacy sizes not empty'; end if; end $$;
drop view public.v_catalogo_proveedor;
alter table public.producto drop column talla;
create view public.v_catalogo_proveedor with (security_invoker=true) as
select p.id_producto,p.slug,p.nom_prod,p.marca,p.precio,p.tipo_prod,p.color,p.img,p.activo,p.id_proveedor,pr.marca as marca_proveedor,pr.tipo_producto as tipo_proveedor
from public.producto p left join public.proveedor pr on pr.id_proveedor=p.id_proveedor;
revoke all on public.v_catalogo_proveedor from public,anon,authenticated;
grant select on public.v_catalogo_proveedor to authenticated;
grant all on public.v_catalogo_proveedor to service_role;
alter table public.producto_variante add column nom_prod varchar(150);
update public.producto_variante v set nom_prod=p.nom_prod from public.producto p where p.id_producto=v.id_producto;
alter table public.producto_variante alter column nom_prod set not null;
alter table public.producto add constraint producto_id_nombre_key unique(id_producto,nom_prod);
alter table public.producto_variante add constraint variante_producto_nombre_fkey foreign key(id_producto,nom_prod) references public.producto(id_producto,nom_prod) on update cascade on delete restrict;
create function shoefit_private.variante_nombre_producto() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select p.nom_prod into strict new.nom_prod from public.producto p where p.id_producto=new.id_producto;
 return new;
end $$;
revoke all on function shoefit_private.variante_nombre_producto() from public,anon,authenticated;
create trigger variante_nombre_producto before insert or update of id_producto on public.producto_variante for each row execute function shoefit_private.variante_nombre_producto();
notify pgrst, 'reload schema';
commit;
