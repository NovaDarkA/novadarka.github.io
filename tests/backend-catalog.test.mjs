import test from "node:test";
import assert from "node:assert/strict";
import {readCatalog} from "../src/services/catalog.js";
import products from "../api/products.ts";
test("catalog reads only active products through fixed query",async()=>{
 const fixture=[{id_producto:1,slug:"sample",precio:null}];
 const result=await readCatalog(async path=>{
   const url=new URL(path,"https://example.com");
   assert.equal(url.pathname,"/rest/v1/producto");
   assert.equal(url.searchParams.get("activo"),"eq.true");
   assert.equal(url.searchParams.get("limit"),"100");
   return Response.json(fixture);
 });
 assert.deepEqual(result,fixture);
});
test("catalog errors are masked",async()=>{
 await assert.rejects(readCatalog(async()=>new Response("private error",{status:403})),{code:"catalog_unavailable"});
 await assert.rejects(readCatalog(async()=>Response.json({unexpected:true})),{code:"catalog_unavailable"});
});
test("catalog rejects mutation methods",async()=>{
 const result=await products.fetch(new Request("https://example.com/api/products",{method:"POST"}));
 assert.equal(result.status,405);
});

test("paginated catalog includes only active variant inventory in a single query",async()=>{const {catalogResponse}=await import("../src/services/catalog.js");const fixture=[{id_producto:1,producto_variante:[{talla:26,existencias:3}]}];const result=await catalogResponse(new Request("https://example.com/api/products?page=1"),async path=>{const q=new URL(path,"https://example.com").searchParams;assert.match(q.get("select"),/producto_variante!producto_variante_id_producto_fkey\(talla,existencias\)/);assert.equal(q.get("producto_variante.activo"),"eq.true");return Response.json(fixture);});assert.deepEqual(result.data,fixture);});
