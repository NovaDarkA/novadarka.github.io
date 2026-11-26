import {createSupabaseTransport} from "./supabase-transport.js";
import {readSession,sessionToken,requireSameOrigin,sessionCookie} from "./session.js";
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

/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function deleteProfile(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 requireSameOrigin(req);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();if(raw.length>2048)throw new HttpError(400,"invalid_request");
 let data;try{data=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_request");}
 if(data?.confirm!=="ELIMINAR"||typeof data.password!=="string"||data.password.length<1||data.password.length>128||Object.keys(data).length!==2)throw new HttpError(400,"invalid_request");
 const profile=await readSession(token,request);if(profile.rolez!=="cliente")throw new HttpError(403,"forbidden");
 const headers={"Content-Type":"application/json"};
 const verified=await request("/auth/v1/token?grant_type=password",{method:"POST",headers,body:JSON.stringify({email:profile.mail,password:data.password})});
 if(verified.status===429)throw new HttpError(429,"try_later");
 if(!verified.ok)throw new HttpError(verified.status>=500?503:401,"invalid_password");
 const result=await verified.json();const fresh=result?.access_token;
 if(typeof fresh!=="string"||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(fresh)||fresh.length>=3800)throw new HttpError(503,"deletion_unavailable");
 let deleted=false;
 try{
  const freshProfile=await readSession(fresh,request);
  if(freshProfile.id_user!==profile.id_user||freshProfile.rolez!=="cliente")throw new HttpError(403,"forbidden");
  const response=await request("/rest/v1/rpc/shoefit_eliminar_cuenta",{method:"POST",headers,body:"{}"},fresh);
  if(response.status===401||response.status===403)throw new HttpError(403,"reauth_required");
  if(!response.ok)throw new HttpError(503,"deletion_unavailable");
  const outcome=await response.json();
  if(outcome?.status==="pending_orders")throw new HttpError(409,"pending_orders");
  if(outcome?.status!=="account_deleted")throw new HttpError(503,"deletion_unavailable");
  deleted=true;return json({status:"account_deleted"},200,{"Set-Cookie":sessionCookie("",0)});
 }finally{
  if(!deleted){try{await request("/auth/v1/logout?scope=local",{method:"POST"},fresh);}catch{/* fresh session is never exposed */}}
 }
}
