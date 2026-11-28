import test from "node:test";import assert from "node:assert/strict";import {prepareOrder,fingerprint,subtractPurchased} from "../frontend/assets/js/order-client.js";
const rows=[{id:"shoe",size:"26",quantity:2}],product=()=>({priceCents:10000});
const response=(price=100,stock=2)=>async()=>Response.json({data:{slug:"shoe",precio:price,variantes:[{id_variante:7,talla:26,existencias:stock,disponible:stock>0}]}});
test("checkout resolves actual variant ID and quantity without sending prices",async()=>assert.deepEqual(await prepareOrder(rows,product,response()),[{id_variante:7,cantidad:2}]));
test("checkout rejects stale prices and insufficient stock",async()=>{await assert.rejects(prepareOrder(rows,product,response(101)),/price_changed/);await assert.rejects(prepareOrder(rows,product,response(100,1)),/stock_unavailable/);});
test("cart fingerprint is stable and successful order removes purchased quantities only",()=>{const extra={id:"other",size:"25",quantity:1};assert.equal(fingerprint([...rows,extra]),fingerprint([extra,...rows]));assert.deepEqual(subtractPurchased([{...rows[0],quantity:3},extra],rows),[{...rows[0],quantity:1},extra]);});
