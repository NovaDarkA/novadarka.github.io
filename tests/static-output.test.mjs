import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
const root = resolve("dist");
import {pages as manifest,regularPages,headerPages,assets} from "../scripts/frontend-manifest.mjs";
const pages=manifest.map(p=>p.name);
const read = path => readFile(join(root,path),"utf8");

test("published output exposes only the intended frontend", async () => {
  const entries = (await readdir(root)).sort();
  assert.deepEqual(entries, [...pages,...assets].sort());
});

test("all local HTML links, fragments and responsive image sources exist", async () => {
  const html = Object.fromEntries(await Promise.all(pages.map(async p => [p, await read(p)])));
  let count = 0;
  for (const [page, source] of Object.entries(html)) {
    const refs = [...source.matchAll(/\s(?:href|src|action)="([^"]+)"/g)].map(m=>m[1]);
    for (const m of source.matchAll(/\ssrcset="([^"]+)"/g)) {
      refs.push(...m[1].split(",").map(s=>s.trim().split(/\s+/)[0]));
    }
    for (const m of source.matchAll(/http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/gi)) refs.push(m[1]);
    for (const ref of refs) {
      if (ref === "#" || /^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(ref)) continue;
      const [pathWithQuery, hash] = ref.split("#");
      const path = pathWithQuery.split("?")[0].replace(/^\//,"");
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
  for (const page of headerPages) {
    assert.match(await read(page), /<a href="carrito.html" aria-label="Carrito"/);
  }
  const admin=await read("administracion.html");
  for (const section of ["productos","clientes","ventas","empleados"]) {
    assert.ok(admin.includes('id="'+section+'"'));
  }
  assert.equal([...admin.matchAll(/data-admin-action="/g)].length,3);
  assert.match(admin,/id="admin-commit" disabled/);
  assert.equal([...admin.matchAll(/class="admin-table"/g)].length,8);
  assert.doesNotMatch(admin,/<form\b/);
});

test("all visible product cards have a selection link with a known product", async()=>{
  const {getProduct}=await import("../frontend/assets/js/products.js");
  for(const page of ["index.html","coleccion.html"]){
    const html=await read(page);
    const cards=[...html.matchAll(/<(article|li) class="(?:flash-card|best-item|product-card)"[^>]*>([\s\S]*?)<\/\1>/g)];
    assert.equal(cards.length,page==="index.html"?10:4);
    for(const card of cards){const match=card[2].match(/href="sorprendeme.html\?producto=([^"]+)"/);assert.ok(match);assert.ok(getProduct(match[1]));}
  }
});

test("all ten storefront screens share the same header disclosures",async()=>{
 for(const page of headerPages){const html=await read(page);assert.equal([...html.matchAll(/class="nav-disclosure"/g)].length,3,page);assert.match(html,/class="account-disclosure nav-disclosure"/);assert.match(html,/data-open-favorites/);assert.match(html,/href="css\/header.css"/);}
});

test("catalog has complete visual controls and no fabricated inventory",async()=>{const html=await read("coleccion.html");for(const id of ["collection-query","collection-brand","collection-type","collection-size","collection-price","collection-sort","collection-prev","collection-next","collection-empty"])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/id="collection-size" disabled/);assert.doesNotMatch(html,/98 Products/);});

test("detail has four gallery controls, quantity and related products slots",async()=>{const html=await read("sorprendeme.html");assert.equal([...html.matchAll(/class="detail-thumb"/g)].length,4);for(const id of ["detail-image","detail-quantity","detail-minus","detail-plus","detail-subtotal","detail-related-grid","detail-availability"])assert.ok(html.includes('id="'+id+'"'));});

test("checkout requires verified client session before enabling confirmation",async()=>{const cart=await read("carrito.html"),html=await read("pedido.html");assert.match(cart,/id="cart-checkout" href="pedido.html"/);assert.match(html,/class="cart-primary checkout-confirm" id="checkout-confirm" disabled/);assert.match(html,/id="checkout-dialog"/);assert.doesNotMatch(html,/<form\b/);assert.ok([...html.matchAll(/<(?:input|textarea)\b[^>]*>/g)].every(m=>m[0].includes("disabled")));});

test("account preview never submits personal information",async()=>{for(const page of ["cuenta.html","recuperar.html"]){const html=await read(page);assert.doesNotMatch(html,/<form\b/);assert.ok([...html.matchAll(/<input\b[^>]*>/g)].every(m=>m[0].includes("disabled")));}const profile=await read("cuenta.html");for(const id of ["perfil","pedidos","favoritos","seguridad"])assert.ok(profile.includes('id="'+id+'"'));assert.match(await read("login.html"),/href="recuperar.html"/);});

test("admin has eight sidebar modules without duplicate overview cards",async()=>{const html=await read("administracion.html");assert.equal([...html.matchAll(/data-module="/g)].length,8);assert.doesNotMatch(html,/admin-overview|data-admin-shortcut/);assert.match(html,/id="admin-current-module"/);assert.match(html,/id="admin-workspace-title"/);assert.match(html,/Consultando base de datos/);});

test("information and error pages expose safe, complete navigation",async()=>{const info=await read("informacion.html"),home=await read("index.html"),error=await read("404.html");for(const id of ["history","technology","jobs","values","contact","faq","guide"]){assert.ok(info.includes('id="'+id+'"'));assert.ok(home.includes('informacion.html#'+id));}assert.doesNotMatch(home,/href="(?:tel:123456789|mailto:shoefit@mail.com)"/);assert.match(error,/href="\/index.html"/);assert.match(error,/href="\/coleccion.html"/);assert.match(error,/content="noindex"/);});

test("frontend sources are grouped and every regular page uses the shared header",async()=>{const rootEntries=await readdir(".");assert.ok(!rootEntries.some(e=>e.endsWith(".html")));assert.equal(regularPages.length,11);assert.equal(headerPages.length,10);for(const page of manifest){const source=await readFile(page.source,"utf8");assert.equal(source.includes("<!-- SHARED_HEADER -->"),page.sharedHeader,page.name);if(page.sharedHeader){assert.doesNotMatch(source,/<header class="site-header">/);const published=await read(page.name);assert.equal([...published.matchAll(/<header class="site-header">/g)].length,1);assert.match(published,/href="css\/ui.css"/);assert.match(published,/href="#contenido"/);assert.match(published,/id="contenido"/);}}});
test("published pages have unique IDs and a single main heading",async()=>{for(const page of [...regularPages,"404.html"]){const html=await read(page);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,page+" duplicate IDs");assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length,1,page+" heading");assert.doesNotMatch(html,/<!-- SHARED_HEADER -->/);}});

test("admin is independent of storefront navigation and keeps an accessible sidebar toggle",async()=>{const html=await read("administracion.html");assert.doesNotMatch(html,/class="site-header"|id="primary-nav"|aria-label="Carrito"/);assert.match(html,/id="admin-sidebar" class="management-sidebar"/);assert.match(html,/id="admin-sidebar-toggle" aria-controls="admin-sidebar" aria-expanded="true"/);assert.match(html,/class="admin-store-link" href="index.html"/);assert.match(html,/href="#contenido"/);assert.match(html,/id="contenido"/);});
