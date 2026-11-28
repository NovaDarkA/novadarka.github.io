import test from "node:test";import assert from "node:assert/strict";import {manage} from "../src/services/admin.js";import {myOrders} from "../src/services/orders.js";
const uid="12345678-1234-1234-1234-123456789abc";
const req=(path,method="GET",body,role=true)=>new Request("https://example.com"+path,{method,headers:{origin:"https://example.com","content-type":"application/json",...(role?{cookie:"__Host-shoefit_session=abc.def.ghi"}:{})},body:body===undefined?undefined:JSON.stringify(body)});
const transport=(role,callback)=>async(path,opts,token)=>{assert.equal(token,"abc.def.ghi");if(path==="/auth/v1/user")return Response.json({id:uid});if(path.startsWith("/rest/v1/usuario?")&&path.includes("auth_id"))return Response.json([{id_user:7,rolez:role}]);return callback(path,opts);};
test("admin access requires authenticated administrator",async()=>{await assert.rejects(manage(req("/api/admin?module=productos","GET",undefined,false),transport("administrador",()=>{throw Error("unreachable")})),{code:"unauthenticated"});await assert.rejects(manage(req("/api/admin?module=productos"),transport("cliente",()=>{throw Error("unreachable")})),{code:"forbidden"});});
test("admin lists allowlisted module",async()=>{const r=await manage(req("/api/admin?module=productos&page=2"),transport("administrador",(path)=>{const u=new URL(path,"https://example.com");assert.equal(u.pathname,"/rest/v1/producto");assert.equal(u.searchParams.get("offset"),"50");return Response.json([{id_producto:2}]);}));assert.deepEqual((await r.json()).data,[{id_producto:2}]);});
test("admin rejects arbitrary table and role fields",async()=>{const no=transport("administrador",()=>{throw Error("unreachable")});await assert.rejects(manage(req("/api/admin?module=auth.users"),no),{code:"invalid_module"});await assert.rejects(manage(req("/api/admin?module=productos","POST",{rolez:"administrador"}),no),{code:"unknown_field"});await assert.rejects(manage(req("/api/admin?module=usuarios&id=3","PATCH",{rolez:"administrador"}),no),{code:"read_only_module"});});
test("validated create/update/delete use caller token, exact record and representation",async()=>{for(const [method,path,body] of [["POST","/api/admin?module=productos",{nom_prod:"Zapato",slug:"zapato",precio:30}],["PATCH","/api/admin?module=productos&id=2",{precio:31}],["DELETE","/api/admin?module=productos&id=2",undefined]]){const r=await manage(req(path,method,body),transport("administrador",(p,o)=>{assert.equal(o.method,method);assert.equal(o.headers.Prefer,"return=representation");assert.equal(new URL(p,"https://example.com").searchParams.get("id_producto"),method==="POST"?null:"eq.2");return Response.json([{id_producto:2}]);}));assert.equal(r.status,method==="POST"?201:200);}});
test("reject negative prices, missing ids and mass deletes",async()=>{const no=transport("administrador",()=>{throw Error("unreachable")});await assert.rejects(manage(req("/api/admin?module=productos&id=2","PATCH",{precio:-1}),no),{code:"invalid_field_precio"});await assert.rejects(manage(req("/api/admin?module=productos","DELETE"),no),{code:"invalid_id"});await assert.rejects(manage(req("/api/admin?module=productos&id=2","PATCH",{img:"img/../private"}),no),{code:"invalid_field_img"});});
test("database conflicts mapped without exposing details",async()=>{await assert.rejects(manage(req("/api/admin?module=productos&id=2","DELETE"),transport("administrador",()=>new Response("private",{status:409}))),{code:"record_conflict"});});
test("orders use authenticated customer's own ID",async()=>{const r=await myOrders(req("/api/orders?cliente=999"),transport("cliente",path=>{const u=new URL(path,"https://example.com");if(u.pathname.endsWith("/cliente")){assert.equal(u.searchParams.get("id_doe"),"eq.7");return Response.json([{id_cliente:9}]);}assert.equal(u.searchParams.get("id_cliente"),"eq.9");return Response.json([]);}));assert.deepEqual(await r.json(),{data:[]});});

test("sales and inventory list linked product names while retaining numeric references",async()=>{for(const [module,table,fk] of [["ventas","venta","venta_id_producto_fkey"],["variantes","producto_variante","producto_variante_id_producto_fkey"]]){const record={id_producto:1,producto:{nom_prod:"Tenis de ejemplo"}};const r=await manage(req("/api/admin?module="+module),transport("administrador",path=>{const u=new URL(path,"https://example.com");assert.equal(u.pathname,"/rest/v1/"+table);assert.ok(u.searchParams.get("select").includes("producto!"+fk+"(nom_prod)"));return Response.json([record]);}));assert.deepEqual((await r.json()).data,[record]);}});

test("products no longer expose or accept the legacy size field in admin CRUD",async()=>{await manage(req("/api/admin?module=productos"),transport("administrador",path=>{assert.ok(!new URL(path,"https://example.com").searchParams.get("select").split(",").includes("talla"));return Response.json([]);}));await assert.rejects(manage(req("/api/admin?module=productos&id=1","PATCH",{talla:26}),transport("administrador",()=>{throw Error("unreachable")})),{code:"unknown_field"});});

test("employees can read only their own safe staff profile and keep product operations",async()=>{
 const staff=transport("empleado",(path,opts)=>{
  const u=new URL(path,"https://example.com");
  if(u.pathname==="/rest/v1/empleado"&&u.searchParams.get("select")==="id_empleado")return Response.json([{id_empleado:5}]);
  if(u.pathname==="/rest/v1/empleado"){
   assert.equal(u.searchParams.get("id_doe"),"eq.7");
   assert.equal(u.searchParams.get("select"),"id_empleado,id_doe,genero,puesto,usuario!empleado_id_doe_fkey(nombre,ap,am)");
   assert.ok(!u.searchParams.get("select").includes("salario"));
   assert.ok(!u.searchParams.get("select").includes("mail"));
   return Response.json([{id_empleado:5,id_doe:7,puesto:"Ventas",usuario:{nombre:"Empleado de prueba"}}]);
  }
  if(u.pathname==="/rest/v1/producto")return Response.json([{id_producto:1}]);
  return Response.json([]);
 });
 const r=await manage(req("/api/admin?module=empleados"),staff);
 assert.equal(r.status,200);assert.deepEqual((await r.json()).data,[{id_empleado:5,id_doe:7,puesto:"Ventas",usuario:{nombre:"Empleado de prueba"}}]);
 const other=await manage(req("/api/admin?module=empleados&id=99"),transport("empleado",(path)=>{const u=new URL(path,"https://example.com");if(u.pathname==="/rest/v1/empleado"&&u.searchParams.get("select")==="id_empleado")return Response.json([{id_empleado:5}]);assert.equal(u.searchParams.get("id_doe"),"eq.7");assert.equal(u.searchParams.get("id_empleado"),"eq.99");return Response.json([]);}));
 assert.deepEqual((await other.json()).data,[]);
 assert.equal((await manage(req("/api/admin?module=productos&id=1","PATCH",{precio:50}),staff)).status,200);
 for(const method of ["POST","PATCH","DELETE"])await assert.rejects(manage(req("/api/admin?module=empleados&id=5",method,method==="DELETE"?undefined:{salario:100}),staff),{code:"forbidden"});
 for(const method of ["POST","PATCH","DELETE"])await assert.rejects(manage(req("/api/admin?module=clientes&id=5",method,method==="DELETE"?undefined:{calle:"Calle de prueba"}),staff),{code:"forbidden"});
 await assert.rejects(manage(req("/api/admin?module=productos"),transport("empleado",(path)=>{const u=new URL(path,"https://example.com");if(u.pathname==="/rest/v1/empleado")return Response.json([]);throw Error("unreachable");})),{code:"forbidden"});
});

test("employee user list never selects employee email and admin employee list uses protected RPC",async()=>{
 const staff=transport("empleado",path=>{const u=new URL(path,"https://example.com");if(u.pathname==="/rest/v1/empleado")return Response.json([{id_empleado:5}]);if(u.pathname==="/rest/v1/usuario"){assert.equal(u.searchParams.get("select"),"id_user,nombre,ap,am");assert.ok(!u.searchParams.get("select").includes("mail"));return Response.json([{id_user:9,nombre:"Cliente"}]);}return Response.json([]);});
 const r=await manage(req("/api/admin?module=usuarios"),staff);assert.equal(r.status,200);
 const admin=transport("administrador",(path,opts)=>{assert.equal(path,"/rest/v1/rpc/shoefit_admin_empleados");assert.equal(opts.method,"POST");assert.deepEqual(JSON.parse(opts.body),{p_id:null,p_offset:0,p_limit:51});return Response.json([{id_empleado:5,salario:20000,usuario:{mail:"admin-visible@example.invalid"}}]);});
 const a=await manage(req("/api/admin?module=empleados"),admin);assert.equal(a.status,200);assert.equal((await a.json()).data[0].salario,20000);
});

test("only administrators can mutate employee records and use minimal database responses",async()=>{
 for(const [method,path,body] of [["POST","/api/admin?module=empleados",{id_doe:7,puesto:"Ventas",salario:100}],["PATCH","/api/admin?module=empleados&id=5",{salario:150}],["DELETE","/api/admin?module=empleados&id=5",undefined]]){
  const r=await manage(req(path,method,body),transport("administrador",(p,o)=>{const u=new URL(p,"https://example.com");assert.equal(u.pathname,"/rest/v1/empleado");assert.equal(u.searchParams.get("select"),"id_empleado");assert.equal(o.headers.Prefer,"return=minimal");return new Response(null,{status:204});}));
  assert.equal(r.status,method==="POST"?201:200);
 }
});
