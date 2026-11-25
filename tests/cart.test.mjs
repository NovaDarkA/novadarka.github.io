import test from "node:test";
import assert from "node:assert/strict";
import {PRODUCT,normalize,changeCart,totals} from "../js/cart.js";
test("cart adds and groups items by size",()=>{let c=changeCart([], "26",1);c=changeCart(c,"26",1);c=changeCart(c,"27",1);assert.equal(c.length,2);assert.equal(c[0].quantity,2);assert.deepEqual(totals(c),{count:3,cents:747000});});
test("quantity decrement and removal recalculate totals",()=>{let c=changeCart([],"26",3);c=changeCart(c,"26",-1);assert.equal(totals(c).cents,498000);assert.deepEqual(changeCart(c,"26",-2),[]);});
test("invalid draft rows and injected price are ignored",()=>{const c=normalize([{id:"other",size:"26",quantity:2},{id:PRODUCT.id,size:"26",quantity:1,priceCents:1},{id:PRODUCT.id,size:"bad",quantity:3},{id:PRODUCT.id,size:"27",quantity:-2}]);assert.deepEqual(c,[{id:PRODUCT.id,size:"26",quantity:1}]);assert.equal(totals(c).cents,249000);});
test("draft quantity is capped",()=>{assert.equal(changeCart([],"26",1000)[0].quantity,99);assert.deepEqual(changeCart([],"bad",1),[]);});

test("different products with the same size remain separate and total correctly",()=>{let c=changeCart([],"26",1,"sport-orange-white");c=changeCart(c,"26",1,"martin-dingman-brown");assert.equal(c.length,2);assert.deepEqual(totals(c),{count:2,cents:745000});assert.equal(changeCart(c,"26",-1,"sport-orange-white")[0].id,"martin-dingman-brown");});
test("products without a catalog price cannot be purchased",()=>{assert.deepEqual(changeCart([],"26",1,"casual-boots-brown"),[]);assert.deepEqual(changeCart([],"26",1,"__proto__"),[]);});
