-- Initial visible catalog from existing Shoefit frontend, not invented stock.
-- Active means visible, NOT in stock or purchasable. Unknown prices stay NULL.
begin;
insert into public.producto (slug,nom_prod,color,marca,talla,precio,tipo_prod,img,activo)
values
 ('flexible-sneakers-gray','Flexible Sneakers for men','Gray',null,null,2490.00,'Sneakers','img/optimized/tenis-gris-lateral-619.webp',true),
 ('sport-orange-white','Sport Shoes special brand orange and white','Orange / White',null,null,3450.00,'Sport Shoes','img/optimized/producto-tenis-naranja-360.webp',true),
 ('martin-dingman-brown','Martin Dingman Brown For Men 123456','Brown','Martin Dingman',null,4000.00,'Casual','img/optimized/producto-oxford-cafe-604.webp',true),
 ('casual-boots-brown','Casual Boots Martin O''Neil Brown','Brown','Martin O''Neil',null,null,'Casual Boots','img/optimized/botas-cafe-casual-268.webp',true)
on conflict (slug) do nothing;
commit;
