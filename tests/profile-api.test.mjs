import test from "node:test";import assert from "node:assert/strict";import {getProfile,updateProfile,deleteProfile} from "../src/services/profile.js";import {catalogResponse} from "../src/services/catalog.js";
const req=(body,method="PATCH",cookie=true)=>new Request("https://example.com/api/profile",{method,headers:{origin:"https://example.com","content-type":"application/json",...(cookie?{cookie:"__Host-shoefit_session=abc.def.ghi"}:{})},body:body===undefined?undefined:JSON.stringify(body)});
const uid="12345678-1234-1234-1234-123456789abc";
const transport=(role,fn)=>async(path,opts,token)=>{assert.equal(token,"abc.def.ghi");if(path==="/auth/v1/user")return Response.json({id:uid});if(path.startsWith("/rest/v1/usuario?"))return Response.json([{id_user:7,rolez:role,nombre:"Test"}]);return fn(path,opts);};
test("profile GET selects caller's customer record",async()=>{const r=await getProfile(req(undefined,"GET"),transport("cliente",path=>{assert.equal(new URL(path,"https://example.com").searchParams.get("id_doe"),"eq.7");return Response.json([{id_cliente:9,cp:"01234"}]);}));assert.equal((await r.json()).data.cp,"01234");});
test("profile PATCH accepts only allowed values and invokes atomic RPC",async()=>{const r=await updateProfile(req({nombre:" Test ",cp:"01234",talla:25.5}),transport("cliente",(p,o)=>{assert.equal(p,"/rest/v1/rpc/shoefit_actualizar_perfil");assert.deepEqual(JSON.parse(o.body),{p_cambios:{nombre:"Test",cp:"01234",talla:25.5}});return Response.json({id_user:7,rolez:"cliente",nombre:"Test"});}));assert.equal(r.status,200);});
test("profile rejects role, email, identity, malformed postal code and anonymous calls",async()=>{const no=async()=>{throw Error("must not call")};for(const body of [{rolez:"administrador"},{mail:"other@example.com"},{id_user:1},{cp:"123"},{talla:-1},{nombre:null}])await assert.rejects(updateProfile(req(body),no),{code:"invalid_profile"});await assert.rejects(getProfile(req(undefined,"GET",false),no),{code:"unauthenticated"});});
test("admin cannot edit customer profile through own-profile RPC",async()=>{await assert.rejects(updateProfile(req({nombre:"Test"}),transport("administrador",()=>{throw Error("must not call")})),{code:"forbidden"});});
test("catalog detail and pagination use fixed safe filters",async()=>{const url="https://example.com/api/products";const detail=await catalogResponse(new Request(url+"?slug=sample"),async path=>{assert.equal(new URL(path,url).searchParams.get("slug"),"eq.sample");return Response.json([{slug:"sample"}]);});assert.equal(detail.data.slug,"sample");const page=await catalogResponse(new Request(url+"?page=2"),async path=>{assert.equal(new URL(path,url).searchParams.get("offset"),"50");return Response.json(Array.from({length:51},()=>({})));});assert.equal(page.data.length,50);assert.equal(page.hasMore,true);await assert.rejects(catalogResponse(new Request(url+"?slug=abc%2Cevil"),async()=>{throw Error("must not call")}),{code:"invalid_slug"});});

const deletionBody={confirm:"ELIMINAR",password:"test-pass-123"};
function deletionTransport({role="cliente",passwordStatus=200,outcome="account_deleted",otherProfile=false}={}){
 const calls=[];
 const request=async(path,opts,token)=>{
  calls.push(path);
  if(path==="/auth/v1/user")return Response.json({id:uid});
  if(path.startsWith("/rest/v1/usuario?"))return Response.json([{id_user:token==="new.fresh.jwt"&&otherProfile?8:7,rolez:role,mail:"test@shoefit.invalid"}]);
  if(path.includes("grant_type=password")){assert.deepEqual(JSON.parse(opts.body),{email:"test@shoefit.invalid",password:deletionBody.password});return Response.json({access_token:"new.fresh.jwt"},{status:passwordStatus});}
  if(path==="/rest/v1/rpc/shoefit_eliminar_cuenta"){assert.equal(token,"new.fresh.jwt");assert.equal(opts.body,"{}");return Response.json({status:outcome});}
  if(path.includes("/logout"))return new Response(null,{status:204});
  assert.fail("unexpected path "+path);
 };
 return {request,calls};
}
test("self deletion requires confirmation and session",async()=>{const never=()=>{assert.fail("upstream should not be called");};await assert.rejects(deleteProfile(req(deletionBody,"DELETE",false),never),{code:"unauthenticated"});await assert.rejects(deleteProfile(req({password:"test-pass-123"},"DELETE"),never),{code:"invalid_request"});await assert.rejects(deleteProfile(req({...deletionBody,id:8},"DELETE"),never),{code:"invalid_request"});});
test("self deletion verifies password and expires the cookie",async()=>{const t=deletionTransport();const r=await deleteProfile(req(deletionBody,"DELETE"),t.request);assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:"account_deleted"});assert.match(r.headers.get("set-cookie"),/Max-Age=0/);});
test("self deletion protects admin, wrong password and mismatched reauth",async()=>{for(const [opts,code] of [[{role:"administrador"},"forbidden"],[{passwordStatus:400},"invalid_password"],[{otherProfile:true},"forbidden"]]){const t=deletionTransport(opts);await assert.rejects(deleteProfile(req(deletionBody,"DELETE"),t.request),{code});assert.ok(!t.calls.some(p=>p.includes("shoefit_eliminar_cuenta")));}});
test("self deletion preserves pending orders and revokes temporary session",async()=>{const t=deletionTransport({outcome:"pending_orders"});await assert.rejects(deleteProfile(req(deletionBody,"DELETE"),t.request),{code:"pending_orders"});assert.ok(t.calls.some(p=>p.includes("/logout")));});
