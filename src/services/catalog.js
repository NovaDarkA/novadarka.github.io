import { createSupabaseTransport } from "./supabase-transport.js";
import { HttpError } from "../lib/http.js";

/** @param {ReturnType<typeof createSupabaseTransport>} request */
export async function readCatalog(request) {
  const params = new URLSearchParams({select:"id_producto,slug,nom_prod,marca,precio,tipo_prod,color,img,publico",activo:"eq.true",order:"id_producto.asc",limit:"100"});
  const response = await request("/rest/v1/producto?" + params.toString());
  if (!response.ok) throw new HttpError(503, "catalog_unavailable");
  const data = await response.json();
  if (!Array.isArray(data)) throw new HttpError(503, "catalog_unavailable");
  return data;
}

/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} request */
export async function readAvailability(req,request){
 const slug=new URL(req.url).searchParams.get("slug")||"";
 if(slug.length>150||! /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))throw new HttpError(400,"invalid_slug");
 const params=new URLSearchParams({select:"id_producto,slug,precio,producto_variante!producto_variante_id_producto_fkey(id_variante,talla,existencias)",slug:"eq."+slug,activo:"eq.true",limit:"1"});
 const response=await request("/rest/v1/producto?"+params);
 if(!response.ok)throw new HttpError(503,"catalog_unavailable");
 const rows=await response.json();if(!Array.isArray(rows))throw new HttpError(503,"catalog_unavailable");
 if(rows.length===0)throw new HttpError(404,"product_not_found");
 const product=rows[0];
 if(!Array.isArray(product.producto_variante))throw new HttpError(503,"catalog_unavailable");
 return {id_producto:product.id_producto,slug:product.slug,precio:product.precio,variantes:product.producto_variante.map((/** @type {{id_variante:number,talla:number,existencias:number}} */ v)=>({id_variante:v.id_variante,talla:v.talla,existencias:v.existencias,disponible:product.precio!==null&&v.existencias>0}))};
}

/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} request */
export async function catalogResponse(req,request){
 const p=new URL(req.url).searchParams;
 const slug=p.get("slug");
 if(slug!==null){
  if(slug.length>150||! /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))throw new HttpError(400,"invalid_slug");
  const q=new URLSearchParams({select:"id_producto,slug,nom_prod,marca,precio,tipo_prod,color,img,publico",slug:"eq."+slug,activo:"eq.true",limit:"1"});
  const r=await request("/rest/v1/producto?"+q);
  if(!r.ok)throw new HttpError(503,"catalog_unavailable");
  const rows=await r.json();if(!Array.isArray(rows))throw new HttpError(503,"catalog_unavailable");
  if(rows.length!==1)throw new HttpError(404,"product_not_found");
  return {data:rows[0]};
 }
 if(!p.has("page"))return {data:await readCatalog(request)};
 const page=p.get("page")||"";
 if(!/^\d+$/.test(page)||Number(page)<1||Number(page)>10000)throw new HttpError(400,"invalid_page");
 const q=new URLSearchParams({select:"id_producto,slug,nom_prod,marca,precio,tipo_prod,color,img,publico,producto_variante!producto_variante_id_producto_fkey(talla,existencias)",activo:"eq.true","producto_variante.activo":"eq.true",order:"id_producto.asc",limit:"51",offset:String((Number(page)-1)*50)});
 const r=await request("/rest/v1/producto?"+q);
 if(!r.ok)throw new HttpError(503,"catalog_unavailable");
 const rows=await r.json();if(!Array.isArray(rows))throw new HttpError(503,"catalog_unavailable");
 return {data:rows.slice(0,50),page:Number(page),hasMore:rows.length>50};
}
