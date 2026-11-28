-- Employee access hardening for the Shoefit disposable CI database.
-- Promote this reviewed script to a Supabase migration after testing on a development branch.
-- No data rows are modified by this script.

-- Employees may read customer records for sales, but may not mutate customers.
drop policy if exists personal_operacion on public.cliente;
alter policy cliente_propio_select on public.cliente using (
  (select shoefit_private.es_administrador())
  or exists (
    select 1 from public.usuario u
    where u.id_user=cliente.id_doe
      and u.auth_id=(select auth.uid())
      and u.rolez='cliente'
  )
);

create policy cliente_empleado_select
  on public.cliente for select to authenticated
  using (
    (select shoefit_private.es_empleado())
    and exists (
      select 1 from public.usuario u
      where u.id_user=cliente.id_doe and u.rolez='cliente'
    )
  );

-- Employees may see customer names for operational references and their own user row,
-- but not other employee or administrator user records.
drop policy if exists usuario_consulta_personal on public.usuario;
create policy usuario_clientes_operacion
  on public.usuario for select to authenticated
  using ((select shoefit_private.es_empleado()) and rolez='cliente');

-- Resolve the current employee's internal user id without recursive RLS evaluation.
create or replace function shoefit_private.usuario_empleado_actual()
returns integer
language sql stable security definer set search_path=''
as $$
  select u.id_user
  from public.usuario u
  where u.auth_id=(select auth.uid()) and u.rolez='empleado'
  limit 1;
$$;
revoke all on function shoefit_private.usuario_empleado_actual() from public,anon,authenticated;
grant execute on function shoefit_private.usuario_empleado_actual() to authenticated;

-- Employee users may select only their own employee row. Administrators retain full RLS access.
drop policy if exists empleado_consulta_personal on public.empleado;
create policy empleado_propio_select
  on public.empleado for select to authenticated
  using (
    (select shoefit_private.es_administrador())
    or (
      (select shoefit_private.es_empleado())
      and id_doe=(select shoefit_private.usuario_empleado_actual())
    )
  );

-- Column privileges are required in addition to RLS: employees must not read salary,
-- including their own. The administrator API reads salary through the guarded RPC below.
revoke select on public.empleado from authenticated;
grant select (id_empleado,id_doe,genero,puesto) on public.empleado to authenticated;

-- SECURITY DEFINER is confined to the private schema and checks the application role itself.
create or replace function shoefit_private.listar_empleados_admin(
  p_id integer default null,
  p_offset integer default 0,
  p_limit integer default 51
)
returns table (
  id_empleado integer,
  id_doe integer,
  genero character varying,
  puesto character varying,
  salario numeric,
  usuario jsonb
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if not (select shoefit_private.es_administrador()) then
    raise exception using errcode='42501',message='forbidden';
  end if;
  return query
    select e.id_empleado,e.id_doe,e.genero,e.puesto,e.salario,
      jsonb_build_object('nombre',u.nombre,'ap',u.ap,'am',u.am,'mail',u.mail)
    from public.empleado e
    join public.usuario u on u.id_user=e.id_doe
    where p_id is null or e.id_empleado=p_id
    order by e.id_empleado
    limit least(greatest(coalesce(p_limit,51),1),51)
    offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function shoefit_private.listar_empleados_admin(integer,integer,integer) from public,anon,authenticated;
grant execute on function shoefit_private.listar_empleados_admin(integer,integer,integer) to authenticated;

-- Only the public invoker wrapper is exposed to PostgREST; the private definer function
-- independently checks es_administrador() before returning personal/salary data.
create or replace function public.shoefit_admin_empleados(
  p_id integer default null,
  p_offset integer default 0,
  p_limit integer default 51
)
returns table (
  id_empleado integer,
  id_doe integer,
  genero character varying,
  puesto character varying,
  salario numeric,
  usuario jsonb
)
language sql stable security invoker set search_path=''
as $$
  select * from shoefit_private.listar_empleados_admin(p_id,p_offset,p_limit);
$$;
revoke all on function public.shoefit_admin_empleados(integer,integer,integer) from public,anon,authenticated;
grant execute on function public.shoefit_admin_empleados(integer,integer,integer) to authenticated;

notify pgrst,'reload schema';
