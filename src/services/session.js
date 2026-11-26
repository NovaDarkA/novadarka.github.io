import {createSupabaseTransport} from "./supabase-transport.js";
import {HttpError,json} from "../lib/http.js";
const cookieName="__Host-shoefit_session";
/** @param {Request} req */
export function requireSameOrigin(req){
 const origin=req.headers.get("origin");
 if(origin!==new URL(req.url).origin)throw new HttpError(403,"invalid_origin");
}
/** @param {Request} req */
export function sessionToken(req){
 const matches=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).filter(s=>s.startsWith(cookieName+"="));
 const value=matches.length===1?matches[0]?.slice(cookieName.length+1):"";
 return typeof value==="string"&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)&&value.length<3800?value:null;
}
/** @param {string} token @param {number} [seconds] */
export function sessionCookie(token,seconds=3600){
 return cookieName+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+Math.max(0,Math.min(3600,Math.floor(seconds)));
}
/** @param {Request} req @param {boolean} [registration] */
export async function credentials(req,registration=false){
 requireSameOrigin(req);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();
 if(raw.length>2048)throw new HttpError(400,"invalid_credentials");
 let data;try{data=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_credentials");}
 const email=typeof data?.email==="string"?data.email.trim().toLowerCase():"";
 const password=typeof data?.password==="string"?data.password:"";
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<(registration?8:1)||password.length>128)throw new HttpError(400,"invalid_credentials");
 return {email,password};
}
/** @param {string} token @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function readSession(token,request=createSupabaseTransport()){
 const userResponse=await request("/auth/v1/user",{},token);
 if(userResponse.status===401||userResponse.status===403)throw new HttpError(401,"unauthenticated");
 if(!userResponse.ok)throw new HttpError(503,"auth_unavailable");
 const user=await userResponse.json();
 if(typeof user?.id!=="string"||!/^[0-9a-f-]{36}$/i.test(user.id))throw new HttpError(401,"unauthenticated");
 return readProfile(user.id,token,request);
}
/** @param {string} userId @param {string} token @param {ReturnType<typeof createSupabaseTransport>} request */
async function readProfile(userId,token,request){
 const params=new URLSearchParams({select:"id_user,nombre,ap,am,mail,rolez",auth_id:"eq."+userId,limit:"1"});
 const response=await request("/rest/v1/usuario?"+params.toString(),{},token);
 if(!response.ok)throw new HttpError(503,"profile_unavailable");
 const rows=await response.json();
 const profile=Array.isArray(rows)&&rows.length===1?rows[0]:null;
 if(!profile||!["cliente","administrador","empleado"].includes(profile.rolez))throw new HttpError(403,"profile_unavailable");
 return profile;
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function login(req,request=createSupabaseTransport()){
 const body=await credentials(req);
 const response=await request("/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(response.status===429)throw new HttpError(429,"try_later");
 if(response.status===400||response.status===401||response.status===403)throw new HttpError(401,"invalid_credentials");
 if(!response.ok)throw new HttpError(503,"auth_unavailable");
 const result=await response.json();
 if(typeof result?.access_token!=="string"||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(result.access_token)||result.access_token.length>=3800)throw new HttpError(503,"auth_unavailable");
 // The successful password grant already returns the verified user.
 // Do not repeat /auth/v1/user on this request; all subsequent private requests still verify it.
 const userId=result.user?.id;
 if(typeof userId!=="string"||!/^[0-9a-f-]{36}$/i.test(userId))throw new HttpError(503,"auth_unavailable");
 const profile=await readProfile(userId,result.access_token,request);
 const age=Number.isFinite(result.expires_in)?result.expires_in:3600;
 return json({role:profile.rolez,redirect:profile.rolez==="administrador"?"/administracion.html":"/cuenta.html"},200,{"Set-Cookie":sessionCookie(result.access_token,age)});
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function register(req,request=createSupabaseTransport()){
 const body=await credentials(req,true);
 const response=await request("/auth/v1/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(response.status===429)throw new HttpError(429,"try_later");
 if(!response.ok)throw new HttpError(response.status>=500?503:400,"registration_unavailable");
 return json({status:"check_email"},202);
}
/** @param {Request} req */
export async function currentSession(req){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 return json({profile:await readSession(token)});
}
/** @param {Request} req */
export async function logout(req){
 requireSameOrigin(req);
 const token=sessionToken(req);
 if(token){try{await createSupabaseTransport()("/auth/v1/logout?scope=local",{method:"POST"},token);}catch{/* clear cookie even if upstream unavailable */}}
 return json({status:"ok"},200,{"Set-Cookie":sessionCookie("",0)});
}
