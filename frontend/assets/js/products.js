// In the browser, the only product source is the public server API.
// Node unit tests load the isolated fixture; it is never served in dist.
export const DEFAULT_PRODUCT_ID="flexible-sneakers-gray";
export const money=n=>n===null?"Precio por confirmar":new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100)+" MXN";
export function mapProduct(row){
 if(!row||!Number.isInteger(row.id_producto)||row.id_producto<=0||typeof row.slug!=="string"||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)||typeof row.nom_prod!=="string"||!row.nom_prod.trim())throw Error("invalid_product");
 const price=row.precio;
 if(price!==null&&(typeof price!=="number"||!Number.isFinite(price)||price<0))throw Error("invalid_price");
 const image=typeof row.img==="string"&&/^img\/[a-zA-Z0-9_./-]+$/.test(row.img)&&!row.img.split("/").some(v=>v===".."||v===".")?row.img:"";
 return Object.freeze({id:row.slug,dbId:row.id_producto,name:row.nom_prod,color:row.color||"Por confirmar",image,priceCents:price===null?null:Math.round(price*100),category:row.tipo_prod||"Sin tipo",brand:row.marca||"",type:row.tipo_prod||""});
}
export async function fetchCatalog(fetcher=fetch){
 const result=[];
 for(let page=1;page<=100;page++){
  const r=await fetcher("/api/products?page="+page,{cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error("catalog_unavailable");
  const data=await r.json();
  if(!Array.isArray(data.data)||typeof data.hasMore!=="boolean")throw Error("catalog_unavailable");
  result.push(...data.data.map(mapProduct));
  if(!data.hasMore)return result;
 }
 throw Error("catalog_limit");
}
let products=[];export let catalogAvailable=false;
if(typeof document==="undefined"){
 const {rows}=await import("../../../tests/catalog-fixture.mjs");products=rows.map(mapProduct);catalogAvailable=true;
}else{
 try{products=await fetchCatalog();catalogAvailable=true;}catch{
  const note=document.createElement("p");note.className="catalog-preview-note";note.setAttribute("role","status");note.textContent="No se pudo cargar el catálogo. Recarga la página para volver a intentarlo.";document.querySelector("main")?.prepend(note);
 }
 document.documentElement.dataset.catalogState=catalogAvailable?"ready":"unavailable";
}
export const PRODUCTS=Object.freeze(Object.fromEntries(products.map(p=>[p.id,p])));
export const PRODUCT=PRODUCTS[DEFAULT_PRODUCT_ID]||products[0]||null;
export const getProduct=id=>typeof id==="string"&&Object.hasOwn(PRODUCTS,id)?PRODUCTS[id]:null;
export function searchProducts(query,favorites=null){
 const normalize=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const words=normalize(String(query??"")).split(/\s+/).filter(Boolean);
 return Object.values(PRODUCTS).filter(p=>{
  if(favorites&&!favorites.includes(p.id))return false;
  const aliases=({"flexible-sneakers-gray":"tenis gris hombre","sport-orange-white":"tenis deportivos naranja blanco","martin-dingman-brown":"zapatos cafe cuero hombre","casual-boots-brown":"botas cafe casual"})[p.id]||"";
  return words.every(w=>normalize([p.name,p.color,p.category,p.brand,aliases].join(" ")).includes(w));
 });
}
export function setImage(img,p){img.removeAttribute("srcset");if(p.image){img.src=p.image;img.hidden=false;}else{img.removeAttribute("src");img.hidden=true;}img.alt=p.name;}
