// Temporary product references from the existing frontend, not database records.
const products=[
  {id:"flexible-sneakers-gray",name:"Flexible Sneakers for men",color:"Gray",image:"img/optimized/tenis-gris-lateral-619.webp",priceCents:249000,category:"Men / Sneakers / Gray"},
  {id:"sport-orange-white",name:"Sport Shoes special brand orange and white",color:"Orange / White",image:"img/optimized/producto-tenis-naranja-360.webp",priceCents:345000,category:"Sport Shoes"},
  {id:"martin-dingman-brown",name:"Martin Dingman Brown For Men 123456",color:"Brown",image:"img/optimized/producto-oxford-cafe-604.webp",priceCents:400000,category:"Men / Martin Dingman"},
  {id:"casual-boots-brown",name:"Casual Boots Martin O'Neil Brown",color:"Brown",image:"img/optimized/botas-cafe-casual-268.webp",priceCents:null,category:"Casual Boots"}
];
export const PRODUCTS=Object.freeze(Object.fromEntries(products.map(p=>[p.id,Object.freeze(p)])));
export const PRODUCT=PRODUCTS["flexible-sneakers-gray"];
export const getProduct=id=>typeof id==="string"&&Object.hasOwn(PRODUCTS,id)?PRODUCTS[id]:null;
