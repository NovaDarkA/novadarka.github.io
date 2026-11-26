import assert from "node:assert/strict";
const origin="https://shoefit-git-develop-shoefit-fullstack-shoefit1.vercel.app";
const required=["SHOEFIT_ADMIN_EMAIL","SHOEFIT_ADMIN_PASSWORD","SHOEFIT_CLIENT_EMAIL","SHOEFIT_CLIENT_PASSWORD"];
if(required.some(key=>!process.env[key])){console.error("Missing test-account environment variables. No authenticated tests executed.");process.exit(2);}
async function request(path,{method="GET",cookie,body}={}){
 const headers={};
 if(cookie)headers.cookie=cookie;
 if(method!=="GET"){headers.origin=origin;headers["content-type"]="application/json";}
 return fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000)});
}
async function login(prefix,role,redirect){
 const r=await request("/api/login",{method:"POST",body:{email:process.env["SHOEFIT_"+prefix+"_EMAIL"],password:process.env["SHOEFIT_"+prefix+"_PASSWORD"]}});
 assert.equal(r.status,200,prefix+" login failed");
 const data=await r.json();assert.equal(data.role,role);assert.equal(data.redirect,redirect);
 const cookie=r.headers.get("set-cookie")||"";
 assert.ok(/^__Host-shoefit_session=[^;]+;/.test(cookie),"missing secure session cookie");
 assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=Lax/i);
 return cookie.split(";")[0];
}
let admin,client;
try{
 admin=await login("ADMIN","administrador","/administracion.html");
 client=await login("CLIENT","cliente","/cuenta.html");
 for(const [cookie,role] of [[admin,"administrador"],[client,"cliente"]]){
  const r=await request("/api/session",{cookie});assert.equal(r.status,200);assert.equal((await r.json()).profile.rolez,role);
 }
 const adminPage=await request("/administracion.html",{cookie:admin});assert.equal(adminPage.status,200);assert.match(await adminPage.text(),/<h1>Panel administrativo<\/h1>/);
 assert.equal((await request("/administracion.html",{cookie:client})).status,403);
 assert.equal((await request("/api/admin?module=productos",{cookie:client})).status,403);
 for(const module of ["productos","clientes","empleados","ventas","proveedores","variantes","pedidos","usuarios"]){
  const r=await request("/api/admin?module="+module,{cookie:admin});assert.equal(r.status,200,module+" read");assert.ok(Array.isArray((await r.json()).data));
 }
 const profile=await request("/api/profile",{cookie:client});assert.equal(profile.status,200);assert.equal((await profile.json()).data.rolez,"cliente");
 const orders=await request("/api/orders",{cookie:client});assert.equal(orders.status,200);assert.ok(Array.isArray((await orders.json()).data));
 console.log("PASS live login, role routing, protected administration, customer reads, and admin module reads.");
}finally{
 for(const cookie of [admin,client].filter(Boolean)){
  const r=await request("/api/logout",{method:"POST",cookie,body:{}});assert.equal(r.status,200);assert.match(r.headers.get("set-cookie")||"",/Max-Age=0/);
 }
}
