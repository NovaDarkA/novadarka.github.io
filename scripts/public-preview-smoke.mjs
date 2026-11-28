import assert from "node:assert/strict";
const origin = "https://shoefit-git-develop-shoefit-fullstack-shoefit1.vercel.app";
async function check(path) {
  // No auth headers, cookies, redirect following or Vercel protection bypass tokens.
  const response = await fetch(origin + path, {redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,path+" returned HTTP "+response.status);
  assert.equal(response.headers.get("location"),null,path+" unexpected redirect");
  return response;
}
const html = await (await check("/")).text();
assert.match(html,/<title>Shoefit\s*\|\s*Inicio<\/title>/i);
const api = await (await check("/api/health")).json();
assert.deepEqual(api,{status:"ok",service:"shoefit-api"});
console.log("Public development alias: anonymous homepage and API return HTTP 200.");

for(const path of ["/api/session","/api/profile","/api/orders","/api/admin?module=productos"]){
 const r=await fetch(origin+path,{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,401,path+" must reject anonymous access");
 assert.deepEqual(await r.json(),{error:"unauthenticated"});
}
const admin=await fetch(origin+"/administracion",{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000)});
assert.equal(admin.status,303);
assert.equal(admin.headers.get("location"),"/login");
console.log("PASS anonymous access denied for private APIs and admin page.");
