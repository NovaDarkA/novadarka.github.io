import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
const origin="https://shoefit-git-develop-shoefit-fullstack-shoefit1.vercel.app";
const email=process.env.SHOEFIT_ADMIN_EMAIL||"admin@shoefit.example";
const password=process.env.SHOEFIT_ADMIN_PASSWORD;
if(!password){console.error("Set SHOEFIT_ADMIN_PASSWORD in your local terminal. No requests made.");process.exit(2);}
let cookie;
const nonce=randomUUID().slice(0,12),brand="Prueba F5 "+nonce,slug="f5-crud-"+nonce;
let providerId,productId;
async function request(path,method="GET",body,expected=200){
 const headers={};
 if(cookie)headers.cookie=cookie;
 if(method!=="GET"){headers.origin=origin;headers["content-type"]="application/json";}
 const r=await fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(25000)});
 assert.equal(r.status,expected,method+" "+path+" returned HTTP "+r.status);
 return r;
}
const path=(module,id)=>"/api/admin?"+new URLSearchParams({module,...(id===undefined?{}:{id:String(id)})});
async function data(module,id,method="GET",body,expected=200){return (await (await request(path(module,id),method,body,expected)).json()).data;}
async function find(module,match){
 for(let page=1;page<=100;page++){const r=await (await request(path(module)+"&page="+page)).json();const row=r.data.find(match);if(row)return row;if(!r.hasMore)return null;}
 throw Error("Cleanup scan exceeded 100 pages.");
}
async function verifyMissing(module,id){assert.deepEqual(await data(module,id),[],"Record still present");}
try{
 const login=await request("/api/login","POST",{email,password});
 const session=await login.json();assert.equal(session.role,"administrador");
 const raw=login.headers.get("set-cookie")||"";assert.match(raw,/^__Host-shoefit_session=[^;]+;/);cookie=raw.split(";")[0];
 const provider=await data("proveedores",undefined,"POST",{marca:brand,tipo_producto:"Demostración escolar"},201);
 providerId=provider.id_proveedor;assert.ok(Number.isInteger(providerId)&&providerId>0);
 assert.equal((await data("proveedores",providerId))[0].marca,brand);
 console.log("PASS proveedor: alta y consulta");
 const product=await data("productos",undefined,"POST",{id_proveedor:providerId,nom_prod:brand,slug,precio:100,activo:false},201);
 productId=product.id_producto;assert.ok(Number.isInteger(productId)&&productId>0);
 assert.equal((await data("productos",productId))[0].slug,slug);
 console.log("PASS producto: alta y consulta");
 await data("proveedores",providerId,"PATCH",{marca:brand+" editada"});
 assert.equal((await data("proveedores",providerId))[0].marca,brand+" editada");
 await data("productos",productId,"PATCH",{precio:125});
 assert.equal(Number((await data("productos",productId))[0].precio),125);
 console.log("PASS modificación en dos tablas");
 await data("productos",productId,"DELETE");await verifyMissing("productos",productId);productId=undefined;
 await data("proveedores",providerId,"DELETE");await verifyMissing("proveedores",providerId);providerId=undefined;
 console.log("PASS eliminación en dos tablas");
 console.log("F5 CRUD HTTP REAL: APROBADO");
}catch(e){
 console.error("F5 CRUD HTTP REAL: NO APROBADO",e.message);
 process.exitCode=1;
}finally{
 if(cookie){
  // Only remove exact, unique temporary records if a response was lost.
  try{
   const p=await find("productos",r=>r.slug===slug&&r.nom_prod===brand);
   if(p)await data("productos",p.id_producto,"DELETE");
   const v=await find("proveedores",r=>r.marca===brand||r.marca===brand+" editada");
   if(v)await data("proveedores",v.id_proveedor,"DELETE");
  }catch(e){console.error("Cleanup incomplete. Temporary slug:",slug,"provider:",brand,e.message);process.exitCode=1;}
  try{await request("/api/logout","POST",{});}catch(e){console.error("Logout failed:",e.message);process.exitCode=1;}
 }
}
