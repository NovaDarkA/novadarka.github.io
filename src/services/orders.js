import {createSupabaseTransport} from "./supabase-transport.js";
import {sessionToken,readSession,requireSameOrigin,canAccessPanel} from "./session.js";
import {HttpError,json} from "../lib/http.js";
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function myOrders(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 const profile=await readSession(token,request);if(profile.rolez!=="cliente")throw new HttpError(403,"forbidden");
 const r=await request("/rest/v1/cliente?"+new URLSearchParams({select:"id_cliente",id_doe:"eq."+profile.id_user,limit:"1"}),{},token);
 if(!r.ok)throw new HttpError(503,"orders_unavailable");
 const clients=await r.json();if(!Array.isArray(clients)||clients.length!==1)throw new HttpError(403,"profile_unavailable");
 const query=new URLSearchParams({select:"id_pedido,estado,costo,creado_en,pedido_productos(id_pedido_producto,id_producto,id_variante,cantidad,precio_unitario,costo,producto(nom_prod,slug))",id_cliente:"eq."+clients[0].id_cliente,order:"creado_en.desc",limit:"100"});
 const response=await request("/rest/v1/pedido?"+query,{},token);
 if(!response.ok)throw new HttpError(503,"orders_unavailable");
 const data=await response.json();if(!Array.isArray(data))throw new HttpError(503,"orders_unavailable");
 return json({data});
}

/** @param {Request} req */
async function readBody(req){
 requireSameOrigin(req);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();if(raw.length>8192)throw new HttpError(413,"body_too_large");
 let body;try{body=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_body");}
 if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpError(400,"invalid_body");
 return body;
}
/** @param {unknown} n */
function validId(n){return typeof n==="number"&&Number.isInteger(n)&&n>0&&n<=2147483647;}
/** @param {Response} response */
async function rpcResult(response){
 if(!response.ok){
  let code="";try{const data=await response.json();code=data?.code||"";}catch{}
  if(code==="23514"||code==="23505"||response.status===409)throw new HttpError(409,"order_conflict");
  if(code==="P0002")throw new HttpError(404,"order_not_found");
  if(response.status===401||response.status===403||code==="42501")throw new HttpError(403,"forbidden");
  if(code==="22023"||response.status===400)throw new HttpError(400,"invalid_order");
  throw new HttpError(503,"orders_unavailable");
 }
 const data=await response.json();
 if(!data||!validId(data.id_pedido)||!["pendiente","cancelado","entregado"].includes(data.estado))throw new HttpError(503,"orders_unavailable");
 return data;
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function createOrder(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 const body=await readBody(req);
 if(Object.keys(body).length!==2||typeof body.key!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.key)||!Array.isArray(body.items)||body.items.length<1||body.items.length>30)throw new HttpError(400,"invalid_cart");
 const seen=new Set();
 for(const item of body.items){
  if(!item||typeof item!=="object"||Array.isArray(item)||Object.keys(item).length!==2||!validId(item.id_variante)||!Number.isInteger(item.cantidad)||item.cantidad<1||item.cantidad>99||seen.has(item.id_variante))throw new HttpError(400,"invalid_cart");
  seen.add(item.id_variante);
 }
 const profile=await readSession(token,request);if(profile.rolez!=="cliente")throw new HttpError(403,"forbidden");
 const response=await request("/rest/v1/rpc/shoefit_crear_pedido",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p_key:body.key,p_items:body.items})},token);
 const data=await rpcResult(response);
 return json({data},data.reused?200:201);
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function changeOrder(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 const body=await readBody(req);
 if(Object.keys(body).length!==2||!validId(body.id)||!["cancelado","entregado"].includes(body.estado))throw new HttpError(400,"invalid_state");
 const profile=await readSession(token,request);
 if(!await canAccessPanel(profile,token,request)&&(profile.rolez!=="cliente"||body.estado!=="cancelado"))throw new HttpError(403,"forbidden");
 const response=await request("/rest/v1/rpc/shoefit_cambiar_estado_pedido",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p_id:body.id,p_estado:body.estado})},token);
 return json({data:await rpcResult(response)});
}
