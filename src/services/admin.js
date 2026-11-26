import {createSupabaseTransport} from "./supabase-transport.js";
import {readSession,sessionToken,requireSameOrigin} from "./session.js";
import {HttpError,json} from "../lib/http.js";

/** @typedef {{type:"text"|"id"|"int"|"money"|"size"|"bool",max?:number,required?:boolean,pattern?:RegExp}} Field */
/** @typedef {{table:string,id:string,fields:Record<string,Field>,readOnly?:boolean}} Module */
/** @type {Record<string,Module>} */
const modules={
 productos:{table:"producto",id:"id_producto",fields:{id_proveedor:{type:"id"},nom_prod:{type:"text",max:150,required:true},marca:{type:"text",max:100},talla:{type:"size"},precio:{type:"money"},tipo_prod:{type:"text",max:100},img:{type:"text",max:255,pattern:/^img\/[a-zA-Z0-9_./-]+$/},slug:{type:"text",max:150,required:true,pattern:/^[a-z0-9]+(-[a-z0-9]+)*$/},activo:{type:"bool"},color:{type:"text",max:100}}},
 clientes:{table:"cliente",id:"id_cliente",fields:{id_doe:{type:"id",required:true},calle:{type:"text",max:150},numero:{type:"text",max:20},colonia:{type:"text",max:100},cp:{type:"text",max:5,pattern:/^\d{5}$/},talla:{type:"size"}}},
 empleados:{table:"empleado",id:"id_empleado",fields:{id_doe:{type:"id",required:true},genero:{type:"text",max:20},puesto:{type:"text",max:100,required:true},salario:{type:"money",required:true}}},
 ventas:{table:"venta",id:"id_venta",fields:{id_cliente:{type:"id",required:true},id_empleado:{type:"id",required:true},id_producto:{type:"id",required:true},cantidad_pares:{type:"int",required:true},costo_de_venta:{type:"money",required:true}}},
 proveedores:{table:"proveedor",id:"id_proveedor",fields:{marca:{type:"text",max:100,required:true},tipo_producto:{type:"text",max:100}}},
 variantes:{table:"producto_variante",id:"id_variante",fields:{id_producto:{type:"id",required:true},talla:{type:"size",required:true},existencias:{type:"int"},activo:{type:"bool"}}},
 pedidos:{table:"pedido",id:"id_pedido",readOnly:true,fields:{id_cliente:{type:"id"},estado:{type:"text"},costo:{type:"money"},creado_en:{type:"text"}}},
 usuarios:{table:"usuario",id:"id_user",readOnly:true,fields:{nombre:{type:"text"},ap:{type:"text"},am:{type:"text"},rolez:{type:"text"}}}
};
/** @param {unknown} value */
function id(value){return typeof value==="number"&&Number.isInteger(value)&&value>0&&value<=2147483647;}
/** @param {Field} field @param {unknown} value @param {string} key */
function validate(field,value,key){
 if(value===null){if(field.required||field.type==="bool"||key==="existencias")throw new HttpError(400,"invalid_field_"+key);return null;}
 let valid=false;
 if(field.type==="text"&&typeof value==="string"){value=value.trim();valid=typeof value==="string"&&value.length>0&&value.length<=(field.max||255)&&(!field.pattern||field.pattern.test(value));if(key==="img"&&typeof value==="string"&&value.split("/").some(p=>p===".."||p==="."))valid=false;}
 if(field.type==="id")valid=id(value);
 if(field.type==="int")valid=typeof value==="number"&&Number.isInteger(value)&&value>=(key==="existencias"?0:1)&&value<=2147483647;
 if(field.type==="money")valid=typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=9999999999.99&&Math.abs(value*100-Math.round(value*100))<0.001;
 if(field.type==="size")valid=typeof value==="number"&&Number.isFinite(value)&&value>0&&value<=999.9&&Math.abs(value*10-Math.round(value*10))<0.00001;
 if(field.type==="bool")valid=typeof value==="boolean";
 if(!valid)throw new HttpError(400,"invalid_field_"+key);
 return value;
}
/** @param {Request} req @param {Module} module */
async function payload(req,module){
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new HttpError(415,"invalid_content_type");
 const raw=await req.text();if(raw.length>8192)throw new HttpError(413,"body_too_large");
 let data;try{data=JSON.parse(raw);}catch{throw new HttpError(400,"invalid_body");}
 if(!data||typeof data!=="object"||Array.isArray(data))throw new HttpError(400,"invalid_body");
 const keys=Object.keys(data);if(keys.length===0)throw new HttpError(400,"empty_body");
 /** @type {Record<string,unknown>} */
 const result={};
 for(const key of keys){const field=Object.hasOwn(module.fields,key)?module.fields[key]:undefined;if(!field)throw new HttpError(400,"unknown_field");result[key]=validate(field,data[key],key);}
 if(req.method==="POST"){for(const [key,field] of Object.entries(module.fields))if(field.required&&!Object.hasOwn(result,key))throw new HttpError(400,"missing_field_"+key);}
 return result;
}
/** @param {Response} response */
async function rows(response){
 if(!response.ok){
  if(response.status===401||response.status===403)throw new HttpError(response.status,"forbidden");
  if(response.status===409)throw new HttpError(409,"record_conflict");
  if(response.status===400)throw new HttpError(400,"invalid_record");
  throw new HttpError(503,"database_unavailable");
 }
 const data=await response.json();if(!Array.isArray(data))throw new HttpError(503,"database_unavailable");return data;
}
/** @param {Request} req @param {ReturnType<typeof createSupabaseTransport>} [request] */
export async function manage(req,request=createSupabaseTransport()){
 const token=sessionToken(req);if(!token)throw new HttpError(401,"unauthenticated");
 if(req.method!=="GET")requireSameOrigin(req);
 const profile=await readSession(token,request);if(profile.rolez!=="administrador")throw new HttpError(403,"forbidden");
 const params=new URL(req.url).searchParams;
 const key=params.get("module")||"";const module=Object.hasOwn(modules,key)?modules[key]:undefined;
 if(!module)throw new HttpError(400,"invalid_module");
 const identifier=params.get("id");
 if(identifier!==null&&(!/^\d+$/.test(identifier)||!id(Number(identifier))))throw new HttpError(400,"invalid_id");
 const query=new URLSearchParams({select:[module.id,...Object.keys(module.fields)].join(",")});
 if(identifier!==null)query.set(module.id,"eq."+Number(identifier));
 if(req.method==="GET"){
  if(key==="empleados")query.set("select",query.get("select")+",usuario!empleado_id_doe_fkey(nombre,ap,am,mail,rolez)");
  if(key==="usuarios")query.set("select",query.get("select")+",mail");
  const page=params.get("page")||"1";if(!/^\d+$/.test(page)||Number(page)<1||Number(page)>10000)throw new HttpError(400,"invalid_page");
  query.set("order",module.id+".asc");query.set("limit",identifier===null?"51":"1");query.set("offset",identifier===null?String((Number(page)-1)*50):"0");
  const result=await rows(await request("/rest/v1/"+module.table+"?"+query,{},token));
  return json({data:result.slice(0,50),page:Number(page),hasMore:result.length>50});
 }
 if(module.readOnly)throw new HttpError(405,"read_only_module");
 if(req.method==="POST"&&identifier!==null||req.method!=="POST"&&identifier===null)throw new HttpError(400,"invalid_id");
 const body=req.method==="DELETE"?undefined:await payload(req,module);
 if(req.method==="PATCH"&&body&&Object.hasOwn(body,"id_doe"))throw new HttpError(400,"immutable_user_link");
 const result=await rows(await request("/rest/v1/"+module.table+"?"+query,{method:req.method,headers:{"Content-Type":"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)},token));
 if(result.length!==1)throw new HttpError(404,"record_not_found");
 return json({data:result[0]},req.method==="POST"?201:200);
}
