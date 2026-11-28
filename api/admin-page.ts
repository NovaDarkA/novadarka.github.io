import { route,json } from "../src/lib/http.js";
import { readSession,sessionToken,canAccessPanel } from "../src/services/session.js";
// Node runtime file access; no public copy of the protected page is deployed.
// @ts-ignore Node built-in provided by Vercel's Node.js runtime.
import {readFile} from "node:fs/promises";
const node=globalThis as unknown as {process:{cwd:()=>string}};
export default {fetch:route({GET:async req=>{
 const token=sessionToken(req);
 if(!token)return new Response(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
 let profile;
 try{profile=await readSession(token);}catch(error){
  if(error instanceof Error&&"status" in error&&error.status===401)return new Response(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
  throw error;
 }
 if(!await canAccessPanel(profile,token))return json({error:"forbidden"},403);
 let html=await readFile(node.process.cwd()+"/frontend/pages/administracion/administracion.html","utf8");
 html=html.replace('<html lang="es-MX">','<html lang="es-MX" data-panel-role="'+(profile.rolez==="administrador"?"administrador":"empleado")+'">');
 if(profile.rolez==="empleado")html=html.replace("<title>Shoefit | Administración</title>","<title>Shoefit | Panel de empleados</title>").replace(">ADMINISTRACIÓN<",">PERSONAL<").replace(">Acceso administrativo<",">Acceso de empleado<").replace(">Panel administrativo<",">Panel de empleados<").replace("> Administración</span>","> Personal</span>");
 return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}});
}})};
