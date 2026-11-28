import {createSupabaseTransport} from "./supabase-transport.js";
import {requireSameOrigin,sessionCookie} from "./session.js";
import {HttpError,json} from "../lib/http.js";

/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function recover(req,request=createSupabaseTransport()){
 requireSameOrigin(req);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();if(raw.length>2048)throw new HttpError(400,"invalid_request");
 let body;try{body=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_request");}
 const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,"invalid_email");
 const headers={"Content-Type":"application/json"};
 if(body.action==="request"){
  const response=await request("/auth/v1/recover",{method:"POST",headers,body:JSON.stringify({email})});
  if(response.status===429)throw new HttpError(429,"try_later");
  if(!response.ok)throw new HttpError(503,"recovery_unavailable");
  return json({status:"check_email"},202);
 }
 if(body.action!=="reset"||typeof body.code!=="string"||!/^\d{6}$/.test(body.code)||typeof body.password!=="string"||body.password.length<8||body.password.length>128)throw new HttpError(400,"invalid_request");
 const verification=await request("/auth/v1/verify",{method:"POST",headers,body:JSON.stringify({email,token:body.code,type:"recovery"})});
 if(verification.status===429)throw new HttpError(429,"try_later");
 if(!verification.ok)throw new HttpError(verification.status>=500?503:400,"invalid_or_expired_code");
 const result=await verification.json();
 const token=result?.access_token;
 if(typeof token!=="string"||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token)||token.length>=3800)throw new HttpError(503,"recovery_unavailable");
 try{
  const updated=await request("/auth/v1/user",{method:"PUT",headers,body:JSON.stringify({password:body.password})},token);
  if(!updated.ok)throw new HttpError(updated.status>=500?503:400,"password_not_updated");
  return json({status:"password_updated"},200,{"Set-Cookie":sessionCookie("",0)});
 }finally{
  try{await request("/auth/v1/logout?scope=global",{method:"POST"},token);}catch{/* recovery token never returned to client */}
 }
}
