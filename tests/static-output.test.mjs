import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
const root = resolve("dist");
const pages = ["index.html", "coleccion.html", "sorprendeme.html", "login.html", "registro.html", "administracion.html", "carrito.html", "pedido.html", "cuenta.html", "recuperar.html", "page_collection.html", "page_login.html", "page_surprise.html"];
const read = path => readFile(join(root,path),"utf8");

test("published output exposes only the intended frontend", async () => {
  const entries = (await readdir(root)).sort();
  assert.deepEqual(entries, [...pages,"css","js","img"].sort());
});

test("all local HTML links, fragments and responsive image sources exist", async () => {
  const html = Object.fromEntries(await Promise.all(pages.map(async p => [p, await read(p)])));
  let count = 0;
  for (const [page, source] of Object.entries(html)) {
    const refs = [...source.matchAll(/\b(?:href|src|action)="([^"]+)"/g)].map(m=>m[1]);
    for (const m of source.matchAll(/\bsrcset="([^"]+)"/g)) {
      refs.push(...m[1].split(",").map(s=>s.trim().split(/\s+/)[0]));
    }
    for (const m of source.matchAll(/http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/gi)) refs.push(m[1]);
    for (const ref of refs) {
      if (ref === "#" || /^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(ref)) continue;
      const [pathWithQuery, hash] = ref.split("#");
      const path = pathWithQuery.split("?")[0];
      const dest = resolve(root, path || page);
      assert.ok(!relative(root,dest).startsWith(".."), page+": "+ref);
      assert.ok((await stat(dest)).isFile(), page+": "+ref);
      if (hash && html[path || page]) assert.ok([...html[path||page].matchAll(/\bid="([^"]+)"/g)].some(m=>m[1]===hash), page+": "+ref);
      count++;
    }
  }
  assert.ok(count > 100);
  console.log("Validated "+count+" local references");
});

test("legacy pages redirect to the current pages", async () => {
  for (const [old,current] of Object.entries({"page_collection.html":"coleccion.html","page_login.html":"login.html","page_surprise.html":"sorprendeme.html"})) {
    assert.ok((await read(old)).includes('content="0;url='+current+'"'));
  }
});

test("cart links are navigable and admin preview does not enable mutations", async () => {
  for (const page of pages.filter(p=>!p.startsWith("page_"))) {
    assert.match(await read(page), /<a href="carrito.html" aria-label="Carrito"/);
  }
  const admin=await read("administracion.html");
  for (const section of ["productos","clientes","ventas","empleados"]) {
    assert.ok(admin.includes('id="'+section+'"'));
  }
  assert.equal([...admin.matchAll(/<button type="button" disabled>/g)].length,3);
});

test("all visible product cards have a selection link with a known product", async()=>{
  const {getProduct}=await import("../js/products.js");
  for(const page of ["index.html","coleccion.html"]){
    const html=await read(page);
    const cards=[...html.matchAll(/<(article|li) class="(?:flash-card|best-item|product-card)"[^>]*>([\s\S]*?)<\/\1>/g)];
    assert.equal(cards.length,page==="index.html"?10:4);
    for(const card of cards){const match=card[2].match(/href="sorprendeme.html\?producto=([^"]+)"/);assert.ok(match);assert.ok(getProduct(match[1]));}
  }
});

test("all ten screens share the same header disclosures",async()=>{
 for(const page of pages.filter(p=>!p.startsWith("page_"))){const html=await read(page);assert.equal([...html.matchAll(/class="nav-disclosure"/g)].length,3,page);assert.match(html,/class="account-disclosure nav-disclosure"/);assert.match(html,/data-open-favorites/);assert.match(html,/href="css\/header.css"/);}
});

test("catalog has complete visual controls and no fabricated inventory",async()=>{const html=await read("coleccion.html");for(const id of ["collection-query","collection-brand","collection-type","collection-size","collection-price","collection-sort","collection-prev","collection-next","collection-empty"])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/id="collection-size" disabled/);assert.doesNotMatch(html,/98 Products/);});

test("detail has four gallery controls, quantity and related products slots",async()=>{const html=await read("sorprendeme.html");assert.equal([...html.matchAll(/class="detail-thumb"/g)].length,4);for(const id of ["detail-image","detail-quantity","detail-minus","detail-plus","detail-subtotal","detail-related-grid","detail-availability"])assert.ok(html.includes('id="'+id+'"'));});

test("checkout is a safe preview with no real submission",async()=>{const cart=await read("carrito.html"),html=await read("pedido.html");assert.match(cart,/id="cart-checkout" href="pedido.html"/);assert.match(html,/class="cart-primary checkout-confirm" disabled/);assert.match(html,/id="checkout-dialog"/);assert.doesNotMatch(html,/<form\b/);assert.ok([...html.matchAll(/<(?:input|textarea)\b[^>]*>/g)].every(m=>m[0].includes("disabled")));});

test("account preview never submits personal information",async()=>{for(const page of ["cuenta.html","recuperar.html"]){const html=await read(page);assert.doesNotMatch(html,/<form\b/);assert.ok([...html.matchAll(/<input\b[^>]*>/g)].every(m=>m[0].includes("disabled")));}const profile=await read("cuenta.html");for(const id of ["perfil","pedidos","favoritos","seguridad"])assert.ok(profile.includes('id="'+id+'"'));assert.match(await read("login.html"),/href="recuperar.html"/);});
