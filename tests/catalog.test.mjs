import test from "node:test";import assert from "node:assert/strict";import {searchProducts} from "../frontend/assets/js/products.js";
test("search covers the four unique draft products",()=>assert.equal(searchProducts("").length,4));
test("search handles Spanish, accents and multiple terms",()=>{assert.equal(searchProducts("TÉNIS gris")[0].id,"flexible-sneakers-gray");assert.equal(searchProducts("zapatos café")[0].id,"martin-dingman-brown");assert.deepEqual(searchProducts("no existe"),[])});
test("favorite filtering uses known IDs only",()=>{assert.equal(searchProducts("",["casual-boots-brown","unknown"]).length,1);assert.deepEqual(searchProducts("",[]),[])});
