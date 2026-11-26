export const products=[
  {id:"flexible-sneakers-gray",name:"Flexible Sneakers for men",color:"Gray",image:"img/optimized/tenis-gris-lateral-619.webp",priceCents:249000,category:"Men / Sneakers / Gray"},
  {id:"sport-orange-white",name:"Sport Shoes special brand orange and white",color:"Orange / White",image:"img/optimized/producto-tenis-naranja-360.webp",priceCents:345000,category:"Sport Shoes"},
  {id:"martin-dingman-brown",name:"Martin Dingman Brown For Men 123456",color:"Brown",image:"img/optimized/producto-oxford-cafe-604.webp",priceCents:400000,category:"Men / Martin Dingman"},
  {id:"casual-boots-brown",name:"Casual Boots Martin O'Neil Brown",color:"Brown",image:"img/optimized/botas-cafe-casual-268.webp",priceCents:null,category:"Casual Boots"}
];

export const rows=products.map((p,i)=>({id_producto:i+1,slug:p.id,nom_prod:p.name,color:p.color,img:p.image,precio:p.priceCents===null?null:p.priceCents/100,marca:i===2?"Martin Dingman":i===3?"Martin O'Neil":null,tipo_prod:["Sneakers","Sport Shoes","Casual Shoes","Casual Boots"][i],talla:null,publico:"hombre"}));
