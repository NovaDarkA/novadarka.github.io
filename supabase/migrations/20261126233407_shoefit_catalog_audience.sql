alter table public.producto add column publico text constraint producto_publico_check check (publico in ('hombre','mujer','unisex'));
update public.producto set publico='hombre' where slug in ('flexible-sneakers-gray','sport-orange-white','martin-dingman-brown','casual-boots-brown') and publico is null;
