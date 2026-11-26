-- Shoefit F3: applied initial PostgreSQL schema.
-- Apply ONLY to a new, dedicated Shoefit Supabase project.
-- Original eight entities preserved. No DROP DATABASE/TABLE or personal data.

create table public.usuario (
  id_user integer generated always as identity primary key,
  auth_id uuid not null unique references auth.users(id) on delete restrict,
  nombre varchar(100) not null check (length(trim(nombre)) > 0),
  ap varchar(100),
  am varchar(100),
  mail varchar(254) not null unique check (mail = lower(trim(mail))),
  img text,
  rolez text not null default 'cliente' check (rolez in ('cliente','empleado','administrador'))
);

create table public.empleado (
  id_empleado integer generated always as identity primary key,
  id_doe integer not null unique references public.usuario(id_user) on delete restrict,
  genero varchar(20),
  puesto varchar(100) not null check (length(trim(puesto)) > 0),
  salario numeric(12,2) not null check (salario >= 0)
);

create table public.proveedor (
  id_proveedor integer generated always as identity primary key,
  marca varchar(100) not null check (length(trim(marca)) > 0),
  tipo_producto varchar(100)
);

create table public.cliente (
  id_cliente integer generated always as identity primary key,
  id_doe integer not null unique references public.usuario(id_user) on delete restrict,
  calle varchar(150),
  numero varchar(20),
  colonia varchar(100),
  cp varchar(5) check (cp ~ '^[0-9]{5}$'),
  talla numeric(4,1) check (talla > 0)
);

create table public.producto (
  id_producto integer generated always as identity primary key,
  id_proveedor integer references public.proveedor(id_proveedor) on delete restrict,
  nom_prod varchar(150) not null check (length(trim(nom_prod)) > 0),
  marca varchar(100),
  talla numeric(4,1) check (talla > 0),
  precio numeric(12,2) check (precio >= 0),
  tipo_prod varchar(100),
  img text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  activo boolean not null default false
);

create table public.pedido (
  id_pedido integer generated always as identity primary key,
  id_cliente integer not null references public.cliente(id_cliente) on delete restrict,
  estado text not null default 'pendiente' check (estado in ('pendiente','entregado','cancelado')),
  costo numeric(12,2) not null default 0 check (costo >= 0),
  creado_en timestamptz not null default now(),
  unique (id_pedido,id_cliente)
);

create table public.pedido_productos (
  id_pedido_producto integer generated always as identity primary key,
  id_pedido integer not null,
  id_cliente integer not null references public.cliente(id_cliente) on delete restrict,
  id_producto integer not null references public.producto(id_producto) on delete restrict,
  cantidad integer not null check (cantidad between 1 and 99),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  costo numeric(12,2) generated always as (cantidad * precio_unitario) stored,
  foreign key (id_pedido,id_cliente) references public.pedido(id_pedido,id_cliente) on delete restrict
);

create table public.venta (
  id_venta integer generated always as identity primary key,
  id_cliente integer not null references public.cliente(id_cliente) on delete restrict,
  id_empleado integer not null references public.empleado(id_empleado) on delete restrict,
  id_producto integer not null references public.producto(id_producto) on delete restrict,
  cantidad_pares integer not null check (cantidad_pares > 0),
  costo_de_venta numeric(12,2) not null check (costo_de_venta >= 0),
  creado_en timestamptz not null default now()
);

-- Index each foreign-key lookup not already covered by an identity/unique index.
create index producto_proveedor_idx on public.producto(id_proveedor);
create index pedido_cliente_idx on public.pedido(id_cliente);
create index detalle_pedido_cliente_idx on public.pedido_productos(id_pedido,id_cliente);
create index detalle_cliente_idx on public.pedido_productos(id_cliente);
create index detalle_producto_idx on public.pedido_productos(id_producto);
create index venta_cliente_idx on public.venta(id_cliente);
create index venta_empleado_idx on public.venta(id_empleado);
create index venta_producto_idx on public.venta(id_producto);

-- Default-deny access; enable RLS on all eight tables before any grants.
alter table public.usuario enable row level security;
alter table public.empleado enable row level security;
alter table public.proveedor enable row level security;
alter table public.cliente enable row level security;
alter table public.producto enable row level security;
alter table public.pedido enable row level security;
alter table public.pedido_productos enable row level security;
alter table public.venta enable row level security;

revoke all on public.usuario,public.empleado,public.proveedor,public.cliente,
  public.producto,public.pedido,public.pedido_productos,public.venta from public,anon,authenticated;

-- Public catalog only; the role column and private records have no client write access.
grant select on public.producto to anon,authenticated;
create policy producto_catalogo_select on public.producto
  for select to anon,authenticated using (activo);

-- Own profile is read-only until the registration/role model is verified.
grant select on public.usuario to authenticated;
create policy usuario_propio_select on public.usuario
  for select to authenticated using ((select auth.uid()) = auth_id);

grant select on public.cliente to authenticated;
create policy cliente_propio_select on public.cliente
  for select to authenticated using (
    exists (select 1 from public.usuario u where u.id_user = cliente.id_doe and u.auth_id = (select auth.uid()))
  );

grant select on public.pedido to authenticated;
create policy pedido_propio_select on public.pedido
  for select to authenticated using (
    exists (select 1 from public.cliente c where c.id_cliente = pedido.id_cliente)
  );

grant select on public.pedido_productos to authenticated;
create policy detalle_propio_select on public.pedido_productos
  for select to authenticated using (
    exists (select 1 from public.pedido p where p.id_pedido = pedido_productos.id_pedido)
  );

-- All remaining grants and admin writes are deferred until tested policies exist.
-- Auth owns credentials; never store passwords in usuario.
