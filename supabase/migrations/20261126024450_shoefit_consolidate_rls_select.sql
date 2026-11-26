-- Consolidate SELECT policies per role/action while retaining exactly the same access.
alter policy usuario_propio_select on public.usuario using (
  (select auth.uid())=auth_id or (select shoefit_private.es_administrador())
);
drop policy usuario_admin_select on public.usuario;

alter policy cliente_propio_select on public.cliente using (
  (select shoefit_private.es_administrador()) or exists (
    select 1 from public.usuario u where u.id_user=cliente.id_doe and u.auth_id=(select auth.uid())
  )
);
drop policy cliente_admin on public.cliente;
create policy cliente_admin_insert on public.cliente for insert to authenticated with check ((select shoefit_private.es_administrador()));
create policy cliente_admin_update on public.cliente for update to authenticated using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy cliente_admin_delete on public.cliente for delete to authenticated using ((select shoefit_private.es_administrador()));

alter policy producto_catalogo_select on public.producto to anon using (activo);
create policy producto_autenticado_select on public.producto for select to authenticated using (activo or (select shoefit_private.es_administrador()));
drop policy producto_admin on public.producto;
create policy producto_admin_insert on public.producto for insert to authenticated with check ((select shoefit_private.es_administrador()));
create policy producto_admin_update on public.producto for update to authenticated using ((select shoefit_private.es_administrador())) with check ((select shoefit_private.es_administrador()));
create policy producto_admin_delete on public.producto for delete to authenticated using ((select shoefit_private.es_administrador()));
