import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, relative, resolve, extname } from "node:path";
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
      const route = pathWithQuery.split("?")[0];
      const cleanPath = route.replace(/^\//,"");
      const path = route==="/"?"index.html":["/hombre","/mujer"].includes(route)?"coleccion.html":cleanPath&&!extname(cleanPath)?cleanPath+".html":cleanPath;
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
  for (const [old,current] of Object.entries({"page_collection.html":"/coleccion","page_login.html":"/login","page_surprise.html":"/sorprendeme"})) {
    assert.ok((await read(old)).includes('content="0;url='+current+'"'));
  }
});

test("cart links are navigable and admin preview does not enable mutations", async () => {
  for (const page of headerPages) {
    assert.match(await read(page), /<a href="\/carrito" aria-label="Carrito"/);
  }
  const admin=await read("administracion.html");
  for (const section of ["productos","clientes","ventas","empleados"]) {
    assert.ok(admin.includes('id="'+section+'"'));
  }
  assert.equal([...admin.matchAll(/data-admin-action="/g)].length,3);
  assert.match(admin,/id="admin-commit" disabled/);
  assert.equal([...admin.matchAll(/class="admin-table"/g)].length,7);
  assert.doesNotMatch(admin,/<form\b/);
});

test("all visible product cards have a selection link with a known product", async()=>{
  const {getProduct}=await import("../frontend/assets/js/products.js");
  for(const page of ["index.html","coleccion.html"]){
    const html=await read(page);
    const cards=[...html.matchAll(/<(article|li) class="(?:flash-card|best-item|product-card)"[^>]*>([\s\S]*?)<\/\1>/g)];
    assert.equal(cards.length,page==="index.html"?10:4);
    for(const card of cards){const match=card[2].match(/href="\/sorprendeme\?producto=([^"]+)"/);assert.ok(match);assert.ok(getProduct(match[1]));}
  }
});

test("all ten storefront screens share the same header disclosures",async()=>{
 for(const page of headerPages){const html=await read(page);assert.equal([...html.matchAll(/class="nav-disclosure"/g)].length,3,page);assert.match(html,/class="account-disclosure nav-disclosure"/);assert.match(html,/data-open-favorites/);assert.match(html,/href="css\/header\.css(?:\?[^"]+)?"/);}
});

test("catalog has complete visual controls and no fabricated inventory",async()=>{const html=await read("coleccion.html");for(const id of ["collection-query","collection-brand","collection-type","collection-size","collection-price","collection-sort","collection-prev","collection-next","collection-empty"])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/id="collection-size" disabled/);assert.doesNotMatch(html,/98 Products/);});

test("detail has four gallery controls, quantity and related products slots",async()=>{const html=await read("sorprendeme.html");assert.equal([...html.matchAll(/class="detail-thumb"/g)].length,4);for(const id of ["detail-image","detail-quantity","detail-minus","detail-plus","detail-related-grid","detail-availability"])assert.ok(html.includes('id="'+id+'"'));});

test("checkout requires verified client session before enabling confirmation",async()=>{const cart=await read("carrito.html"),html=await read("pedido.html");assert.match(cart,/id="cart-checkout" href="\/pedido"/);assert.match(html,/class="cart-primary checkout-confirm" id="checkout-confirm" disabled/);assert.match(html,/id="checkout-dialog"/);assert.doesNotMatch(html,/<form\b/);assert.ok([...html.matchAll(/<(?:input|textarea)\b[^>]*>/g)].every(m=>m[0].includes("disabled")));});

test("account preview never submits personal information",async()=>{for(const page of ["cuenta.html"]){const html=await read(page);assert.match(html,/id="account-delete-form"[^>]*hidden/);assert.ok([...html.matchAll(/<input\b[^>]*>/g)].every(m=>m[0].includes("disabled")));}const profile=await read("cuenta.html");for(const id of ["perfil","pedidos","favoritos","seguridad"])assert.ok(profile.includes('id="'+id+'"'));assert.match(await read("login.html"),/href="\/recuperar"/);});

test("admin has seven sidebar modules without duplicate overview cards",async()=>{const html=await read("administracion.html");assert.equal([...html.matchAll(/data-module="/g)].length,7);assert.doesNotMatch(html,/admin-overview|data-admin-shortcut/);assert.match(html,/id="admin-current-module"/);assert.match(html,/id="admin-workspace-title"/);assert.match(html,/class="management-status" role="alert" hidden/);});

test("information and error pages expose safe, complete navigation",async()=>{const info=await read("informacion.html"),home=await read("index.html"),error=await read("404.html");for(const id of ["history","technology","jobs","values","contact","faq","guide"]){assert.ok(info.includes('id="'+id+'"'));assert.ok(home.includes('/informacion#'+id));}assert.doesNotMatch(home,/href="(?:tel:123456789|mailto:shoefit@mail.com)"/);assert.match(error,/href="\/"/);assert.match(error,/href="\/coleccion"/);assert.match(error,/content="noindex"/);});

test("frontend sources are grouped and every regular page uses the shared header",async()=>{const rootEntries=await readdir(".");assert.ok(!rootEntries.some(e=>e.endsWith(".html")));assert.equal(regularPages.length,11);assert.equal(headerPages.length,10);for(const page of manifest){const source=await readFile(page.source,"utf8");assert.equal(source.includes("<!-- SHARED_HEADER -->"),page.sharedHeader,page.name);if(page.sharedHeader){assert.doesNotMatch(source,/<header class="site-header">/);const published=await read(page.name);assert.equal([...published.matchAll(/<header class="site-header">/g)].length,1);assert.match(published,/href="css\/ui\.css(?:\?[^"]+)?"/);assert.match(published,/href="#contenido"/);assert.match(published,/id="contenido"/);}}});
test("published pages have unique IDs and a single main heading",async()=>{for(const page of [...regularPages,"404.html"]){const html=await read(page);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,page+" duplicate IDs");assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length,1,page+" heading");assert.doesNotMatch(html,/<!-- SHARED_HEADER -->/);}});

test("admin is independent of storefront navigation and keeps an accessible sidebar toggle",async()=>{const html=await read("administracion.html");assert.doesNotMatch(html,/class="site-header"|id="primary-nav"|aria-label="Carrito"/);assert.match(html,/id="admin-sidebar" class="management-sidebar"/);assert.match(html,/id="admin-sidebar-toggle" aria-controls="admin-sidebar" aria-expanded="true"/);assert.match(html,/class="admin-store-link" href="\/"/);assert.match(html,/href="#contenido"/);assert.match(html,/id="contenido"/);});

test("recovery has an accessible form and password controls start disabled",async()=>{const html=await read("recuperar.html");assert.match(html,/id="recovery-form" method="post"/);assert.match(html,/id="recovery-step" hidden/);assert.match(html,/name="password" type="password"[^>]*disabled/);assert.match(html,/src="js\/recovery\.js(?:\?[^"]+)?"/);});

test("connected account notice stays hidden after a successful sign-in",async()=>{
  const html=await read("cuenta.html"),script=await read("js/account.js");
  assert.match(html,/class="account-notice" hidden/);
  assert.match(script,/notice\.hidden=true/);
  assert.match(script,/notice\.hidden=false/);
});

test("storefront product card names and actions are centered",async()=>{
  const collection=await read("css/collection.css"),styles=await read("css/styles.css");
  assert.match(collection,/\.catalog-page \.product-card\{[^}]*text-align:center/);
  assert.match(collection,/\.catalog-page \.product-card h2\{[^}]*text-align:center/);
  assert.match(styles,/\.flash-card h3\{[^}]*text-align:center/);
  assert.match(styles,/\.best-item h3\{[^}]*text-align:center/);
});

test("storefront home links use the canonical root and all catalog products are rendered",async()=>{
 for(const page of headerPages){assert.match(await read(page),/class="brand" href="\/"/);assert.doesNotMatch(await read(page),/href="\/?index\.html(?:#inicio)?"/);}
 const js=await read("js/home-catalog.js"),css=await read("css/cart.css");
 assert.match(js,/render\(flash,"\.flash-card",products\)/);
 assert.match(css,/\.best-item \.product-select\{margin-top:auto\}/);
 assert.match(css,/\.flash-card \.product-select\{width:100%;margin-top:auto\}/);
});

test("home canonical fallback handles the legacy index path and cache-busted UI",async()=>{
 const html=await read("index.html"),css=await read("css/ui.css");
 assert.match(html,/'\/index\.html'/);
 assert.match(html,/href="css\/ui\.css\?v=20261126-18"/);
 assert.match(css,/\.best-item\{display:grid;grid-template-rows:auto 1fr auto/);
 assert.match(css,/\.flash-card\{display:grid;grid-template-rows:auto 1fr auto auto/);
});

test("all published links use extensionless routes",async()=>{for(const page of [...regularPages,"404.html"]){const html=await read(page);assert.doesNotMatch(html,/(?:href|action)="[^"]*\.html(?:[?#"])/i,page);}});

test("storefront pages and navigation are Spanish",async()=>{
 for(const page of regularPages){const html=await read(page);assert.match(html,/<html lang="es-MX">/);assert.doesNotMatch(html,/lang="en"/);}
 const home=await read("index.html"),login=await read("login.html"),register=await read("registro.html");
 assert.match(home,/>Hombres /);assert.match(home,/>Mujeres /);assert.match(home,/OFERTA RELÁMPAGO/);
 assert.match(login,/>Iniciar sesión</);assert.match(register,/>Crear cuenta</);
 assert.doesNotMatch(home,/>FLASH SALE<|>See more |Explore our products/);
});

test("all regular pages include bilingual language support",async()=>{for(const page of regularPages){const html=await read(page);assert.match(html,/data-language/);assert.match(html,/\/js\/language\.js\?v=20261126-18/);}});

test("employee table omits roles but keep linked identity",async()=>{const html=await read("administracion.html");for(const name of ["empleados"]){const section=html.split('<section id="'+name+'"')[1].split("</section>")[0];assert.doesNotMatch(section,/<th[^>]*>Rol<|<option[^>]*>Rol</);assert.match(section,/>Correo electrónico</);}const js=await read("js/administracion.js");assert.doesNotMatch(js,/u\?\.rolez/);});

test("separate catalog navigation and coming soon label",async()=>{const h=await read("index.html"),d=await read("sorprendeme.html");assert.match(h,/href="\/hombre"/);assert.match(h,/href="\/mujer"/);assert.match(d,/id="detail-coming-soon" hidden>Próximamente/);});

test("product photos share the store background instead of white rectangles",async()=>{const css=await read("css/ui.css");assert.match(css,/\.catalog-page \.product-card img[^{}]*\{background:transparent;mix-blend-mode:multiply\}/);assert.match(css,/\.detail-image-stage\{background:var\(--cream\)\}/);});

test("client actions are hidden and detail stock errors use a red box without an estimated subtotal",async()=>{const html=await read("sorprendeme.html"),js=await read("js/cart.js"),css=await read("css/cart.css"),admin=await read("js/administracion.js");assert.doesNotMatch(html,/id="detail-subtotal"/);assert.match(js,/setProductStatus\("La cantidad supera las existencias disponibles\.",true\)/);assert.match(css,/\.cart-product-status\.cart-product-error\{[^}]*background:#ffe5e5/);assert.match(admin,/actionGroup\.hidden=selected==="clientes"\|\|selected==="pedidos"\|\|restricted/);});

test("client toolbar has an explicit layout-level hide rule",async()=>{const html=await read("administracion.html"),css=await read("css/management.css");assert.match(html,/class="management-actions"[^>]* hidden>/);assert.match(css,/html\[data-active-admin-module="clientes"\][^{}]+\{display:none!important\}/);});

test("admin and employee workspaces show only real errors, not connection notices",async()=>{const html=await read("administracion.html"),js=await read("js/administracion.js"),css=await read("css/management.css");assert.match(html,/class="management-status" role="alert" hidden/);assert.doesNotMatch(js,/Base de datos conectada|Operaciones reales protegidas por la cuenta administrativa/);assert.match(js,/showError\("Sin acceso a los datos",e.message\)/);assert.match(css,/\.management-status\[hidden\]\{display:none!important\}/);});

test("user management is removed from the web interface but internal references remain",async()=>{const html=await read("administracion.html"),js=await read("js/administracion.js"),client=await read("js/admin-client.js");assert.doesNotMatch(html,/data-module="usuarios"|id="usuarios"|href="#usuarios"/);assert.match(js,/panels\.some\(panel=>panel\.id===requested\)/);assert.match(client,/"usuarios"/);});

test("cart and checkout show an estimated arrival date instead of technical notes",async()=>{for(const page of ["carrito.html","pedido.html"]){const html=await read(page);assert.match(html,/data-delivery-estimate/);assert.doesNotMatch(html,/<dd>Por calcular<\/dd>|Los precios, tallas, disponibilidad y envío se confirmarán|El servidor confirma el importe al registrar el pedido/);}});

test("orders omit the generic toolbar but retain order state actions",async()=>{const html=await read("administracion.html"),js=await read("js/administracion.js"),css=await read("css/management.css");assert.match(js,/actionGroup\.hidden=selected==="clientes"\|\|selected==="pedidos"\|\|restricted/);assert.match(css,/html\[data-active-admin-module="pedidos"\][^{}]+\{display:none!important\}/);assert.match(html,/data-order-state="entregado"/);assert.match(html,/data-order-state="cancelado"/);});
