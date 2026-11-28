// Checkout resolves current variant IDs and stock before creating any order.
export async function prepareOrder(rows,getProduct,fetcher=fetch){
 if(!Array.isArray(rows)||!rows.length||rows.length>30)throw Error("invalid_cart");
 const unique=[...new Set(rows.map(r=>r.id))];
 const availability=new Map(await Promise.all(unique.map(async id=>{
  const r=await fetcher("/api/availability?slug="+encodeURIComponent(id),{cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error("availability_unavailable");
  const {data}=await r.json();
  if(data?.slug!==id||!Array.isArray(data.variantes))throw Error("availability_unavailable");
  return [id,data];
 })));
 const seen=new Set();
 return rows.map(row=>{
  const p=getProduct(row.id),a=availability.get(row.id);
  if(!p||p.priceCents===null||typeof a.precio!=="number"||Math.round(a.precio*100)!==p.priceCents)throw Error("price_changed");
  const v=a.variantes.find(x=>String(x.talla)===row.size);
  if(!v||!v.disponible||!Number.isInteger(v.id_variante)||v.id_variante<=0||!Number.isInteger(v.existencias)||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>99||v.existencias<row.quantity||seen.has(v.id_variante))throw Error("stock_unavailable");
  seen.add(v.id_variante);return {id_variante:v.id_variante,cantidad:row.quantity};
 });
}
export const fingerprint=rows=>JSON.stringify(rows.map(r=>[r.id,r.size,r.quantity]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
export function subtractPurchased(current,purchased){
 const counts=new Map(purchased.map(r=>[r.id+":"+r.size,r.quantity]));
 return current.map(r=>({...r,quantity:r.quantity-(counts.get(r.id+":"+r.size)||0)})).filter(r=>r.quantity>0);
}
