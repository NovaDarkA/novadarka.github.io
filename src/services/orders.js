import {createSupabaseTransport} from "./supabase-transport.js";
import {sessionToken,readSession} from "./session.js";
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
