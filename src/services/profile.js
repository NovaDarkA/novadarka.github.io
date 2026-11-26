import {createSupabaseTransport} from "./supabase-transport.js";
import {readSession,sessionToken,requireSameOrigin} from "./session.js";
import {HttpError,json} from "../lib/http.js";
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function getProfile(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 const profile=await readSession(token,request);if(profile.rolez!=="cliente")throw new HttpError(403,"forbidden");
 const response=await request("/rest/v1/cliente?"+new URLSearchParams({select:"id_cliente,calle,numero,colonia,cp,talla",id_doe:"eq."+profile.id_user,limit:"1"}),{},token);
 if(!response.ok)throw new HttpError(503,"profile_unavailable");
 const rows=await response.json();if(!Array.isArray(rows)||rows.length!==1)throw new HttpError(404,"profile_not_found");
 return json({data:{...profile,...rows[0]}});
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function updateProfile(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 requireSameOrigin(req);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();if(raw.length>4096)throw new HttpError(413,"body_too_large");
 let input;try{input=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_profile");}
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length===0)throw new HttpError(400,"invalid_profile");
 /** @type {Record<string,number>} */
 const lengths={nombre:100,ap:100,am:100,calle:150,numero:20,colonia:100,cp:5};
 /** @type {Record<string,unknown>} */
 const changes={};
 for(const [key,value] of Object.entries(input)){
  if(key==="talla"){if(value!==null&&(typeof value!=="number"||!Number.isFinite(value)||value<=0||value>999.9||Math.abs(value*10-Math.round(value*10))>0.00001))throw new HttpError(400,"invalid_profile");changes[key]=value;continue;}
  const max=Object.hasOwn(lengths,key)?lengths[key]:undefined;if(max===undefined)throw new HttpError(400,"invalid_profile");
  if(value===null&&key!=="nombre"){changes[key]=null;continue;}
  if(typeof value!=="string"||value.trim().length<1||value.trim().length>max||(key==="cp"&&!/^\d{5}$/.test(value.trim())))throw new HttpError(400,"invalid_profile");
  changes[key]=value.trim();
 }
 const profile=await readSession(token,request);if(profile.rolez!=="cliente")throw new HttpError(403,"forbidden");
 const response=await request("/rest/v1/rpc/shoefit_actualizar_perfil",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p_cambios:changes})},token);
 if(response.status===400)throw new HttpError(400,"invalid_profile");
 if(response.status===401||response.status===403)throw new HttpError(403,"forbidden");
 if(!response.ok)throw new HttpError(503,"profile_unavailable");
 const result=await response.json();if(!result||result.id_user!==profile.id_user||result.rolez!=="cliente")throw new HttpError(503,"profile_unavailable");
 return json({data:result});
}
