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

export function searchProducts(query, favorites=null){
 const normalize=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const words=normalize(String(query??"")).split(/\s+/).filter(Boolean);
 return Object.values(PRODUCTS).filter(p=>{
   if(favorites&&!favorites.includes(p.id))return false;
   const aliases=({"flexible-sneakers-gray":"tenis gris hombre","sport-orange-white":"tenis deportivos naranja blanco","martin-dingman-brown":"zapatos cafe cuero hombre","casual-boots-brown":"botas cafe casual"})[p.id]||"";
   const text=normalize([p.name,p.color,p.category,aliases].join(" "));
   return words.every(w=>text.includes(w));
 });
}
