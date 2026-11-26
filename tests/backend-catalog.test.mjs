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
