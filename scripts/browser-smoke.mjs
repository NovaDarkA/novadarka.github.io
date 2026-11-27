import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, relative } from "node:path";
import assert from "node:assert/strict";
import {regularPages} from "./frontend-manifest.mjs";
import {rows as catalogRows} from "../tests/catalog-fixture.mjs";
const root=resolve("dist");
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".webp":"image/webp"};
let checkoutFixture=false,attempts=[],profilePatch=null,orderPatch=null,adminFixture=false,adminChanges=[];
let recoveryAttempts=[];
let adminProducts=[{id_producto:1,id_proveedor:null,nom_prod:'Tenis prueba',marca:null,talla:null,precio:100,tipo_prod:'Tenis',img:null,slug:'tenis-prueba',activo:true,color:null}];
const server=createServer(async(req,res)=>{
  try {
    const requestUrl=new URL(req.url,"http://localhost");const pathname=requestUrl.pathname;
    if(pathname==="/api/recovery"&&req.method==="POST"){let raw="";for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);recoveryAttempts.push(body);res.setHeader("Content-Type","application/json");if(body.action==="request"){res.statusCode=202;res.end(JSON.stringify({status:"check_email"}));}else if(body.code!=="123456"){res.statusCode=400;res.end(JSON.stringify({error:"invalid_or_expired_code"}));}else{res.end(JSON.stringify({status:"password_updated"}));}return;}
    if(pathname==="/api/products"){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({data:catalogRows.map((p,i)=>({...p,producto_variante:i===0?[{talla:26,existencias:3}]:[]})),page:1,hasMore:false}));return;}
    if(pathname==="/api/availability"){const p=catalogRows.find(p=>p.slug===requestUrl.searchParams.get("slug"));res.setHeader("Content-Type","application/json");res.end(JSON.stringify({data:{id_producto:p.id_producto,slug:p.slug,precio:p.precio,variantes:checkoutFixture?[{id_variante:7,talla:26,existencias:5,disponible:true}]:[]}}));return;}
    if(checkoutFixture&&pathname==="/api/profile"){if(req.method==="PATCH"){let raw="";for await(const chunk of req)raw+=chunk;profilePatch=JSON.parse(raw);}res.setHeader("Content-Type","application/json");res.end(JSON.stringify({data:{id_user:999,rolez:"cliente",nombre:"Cliente prueba",mail:"test@example.invalid",calle:"Calle A",numero:"1",cp:"01234",colonia:"Centro",...profilePatch}}));return;}
    if(checkoutFixture&&pathname==="/api/orders"&&req.method==="PATCH"){let raw="";for await(const chunk of req)raw+=chunk;orderPatch=JSON.parse(raw);res.setHeader("Content-Type","application/json");res.end(JSON.stringify({data:{id_pedido:123,estado:"cancelado"}}));return;}
    if(checkoutFixture&&pathname==="/api/orders"&&req.method==="GET"){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({data:[{id_pedido:123,estado:orderPatch?"cancelado":"pendiente",costo:4980,creado_en:"2026-11-25T00:00:00Z",pedido_productos:[{id_producto:1,cantidad:2,producto:{nom_prod:"Tenis"}}]}]}));return;}
    if(checkoutFixture&&pathname==="/api/orders"&&req.method==="POST"){let raw="";for await(const chunk of req)raw+=chunk;attempts.push(JSON.parse(raw));res.setHeader("Content-Type","application/json");if(attempts.length===1){res.statusCode=503;res.end(JSON.stringify({error:"unavailable"}));}else{res.statusCode=201;res.end(JSON.stringify({data:{id_pedido:123,estado:"pendiente",costo:4980,reused:true}}));}return;}
    if(adminFixture&&pathname==="/api/admin"){
     const module=requestUrl.searchParams.get("module"),id=Number(requestUrl.searchParams.get("id")),method=req.method;
     res.setHeader("Content-Type","application/json");
     const records=module==="productos"?adminProducts:module==="proveedores"?[]:module==="usuarios"?[{id_user:999,nombre:"Cliente prueba",rolez:"cliente"}]:module==="pedidos"?[{id_pedido:123,id_cliente:1,estado:"pendiente",costo:100,creado_en:"2026-11-25"}]:[];
     if(method==="GET"){res.end(JSON.stringify({data:records,page:1,hasMore:false}));return;}
     if(module!=="productos"){res.statusCode=400;res.end(JSON.stringify({error:"invalid_module"}));return;}
     let raw="";for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;adminChanges.push({method,id,body});
     if(method==="POST"){const row={id_producto:2,...body};adminProducts.push(row);res.statusCode=201;res.end(JSON.stringify({data:row}));return;}
     if(method==="PATCH"){const row=adminProducts.find(x=>x.id_producto===id);Object.assign(row,body);res.end(JSON.stringify({data:row}));return;}
     if(method==="DELETE"){const row=adminProducts.find(x=>x.id_producto===id);adminProducts=adminProducts.filter(x=>x.id_producto!==id);res.end(JSON.stringify({data:row}));return;}
    }
    const path=resolve(root,"."+ (pathname==="/"?"/index.html":["/hombre","/mujer"].includes(pathname)?"/coleccion.html":!extname(pathname)?pathname+".html":pathname));
    if(relative(root,path).startsWith("..")) {res.writeHead(403).end();return;}
    res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");
    res.end(await readFile(path));
  } catch {res.writeHead(404,{"Content-Type":"text/html"}).end(await readFile(join(root,"404.html")));}
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),"shoefit-chrome-"));
let chrome, socket;
let chromeLog="";
try {
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const origin="http://127.0.0.1:"+server.address().port;
  chrome=spawn(process.env.CHROME_BIN||"google-chrome",["--headless","--no-sandbox","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  chrome.stderr.on("data",chunk=>{chromeLog=(chromeLog+chunk).slice(-4000)});
  let launchError; chrome.on("error",e=>{launchError=e});
  let port;
  for(let i=0;i<400&&!port;i++){if(launchError)throw launchError;try{port=(await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]}catch{await delay(100)}}
  assert.ok(port,"Chrome DevTools did not start: "+chromeLog);
  const tabs=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();
  socket=new WebSocket(tabs.find(t=>t.type==="page").webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.addEventListener("open",r,{once:true});socket.addEventListener("error",j,{once:true})});
  let sequence=0;
  const pending=new Map();
  socket.addEventListener("message",e=>{const m=JSON.parse(e.data);const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}});
  function call(method,params={}) {
    return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error("Timeout "+method))},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
  }
  async function evaluate(expression){const r=await call("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  await call("Page.enable");await call("Network.enable");
  await call("Page.addScriptToEvaluateOnNewDocument",{source:"try{localStorage.setItem('shoefit.language','es')}catch{}"});
  // External fonts are intentionally excluded; check the local application without network dependencies.
  await call("Network.setBlockedURLs",{urls:["*fonts.googleapis.com/*","*fonts.gstatic.com/*"]});
  const pages=regularPages;
  for(const width of [1366,1024,820,650,390,320]){
    await call("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width<=650});
    for(const page of pages){
      const url=origin+(page==="index.html"?"/":"/"+page.slice(0,-5));
      await call("Page.navigate",{url});
      let ready=false;
      for(let i=0;i<100;i++){try{ready=await evaluate("location.href === "+JSON.stringify(url)+" && document.readyState === 'complete'");if(ready)break}catch{}await delay(100)}
      assert.ok(ready,"Page failed to load "+page);
      if(page!=="administracion.html"){for(let i=0;i<100;i++){if(await evaluate("document.documentElement.dataset.catalogState==='ready' && !!document.querySelector('.catalog-dialog')"))break;await delay(50);}}
      const state=await evaluate("(async()=>{const imgs=[...document.images].filter(i=>!i.hidden);imgs.forEach(i=>i.loading='eager');await Promise.allSettled(imgs.map(i=>i.decode()));return {width:innerWidth,scroll:document.documentElement.scrollWidth,images:imgs.length,broken:imgs.filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),styles:[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>!l.href.includes('googleapis')).every(l=>!!l.sheet),title:document.title}})()");
      assert.equal(state.width,width,page+" viewport");
      assert.ok(state.title.includes("Shoefit"),page+" title");
      assert.equal(state.styles,true,page+" local CSS");
      assert.deepEqual(state.broken,[],page+" images");
      assert.ok(state.scroll<=width+2,page+" horizontal overflow: "+state.scroll);
      if(width<=650 && page!=="administracion.html") {
        const menu=await evaluate("(()=>{const b=document.querySelector('.menu-toggle'),n=document.querySelector('#primary-nav');if(!b||!n)return false;b.click();const open=b.getAttribute('aria-expanded')==='true'&&n.classList.contains('is-open');b.click();return open&&b.getAttribute('aria-expanded')==='false'&&!n.classList.contains('is-open')})()");
        assert.equal(menu,true,page+" mobile menu");
      }
      await call("Page.bringToFront");
      const skip=await evaluate("(async()=>{const a=document.querySelector('.skip-link');a.focus({preventScroll:true});await new Promise(r=>setTimeout(r,100));const rect=a.getBoundingClientRect(),style=getComputedStyle(a);return {focused:document.activeElement===a,active:document.activeElement?.tagName,top:rect.top,bottom:rect.bottom,display:style.display,visibility:style.visibility,position:style.position,transform:style.transform,hasTarget:!!document.querySelector(a.getAttribute('href'))}})()");
      assert.ok(skip.focused&&skip.bottom>0&&skip.top<844&&skip.hasTarget,page+" keyboard skip link "+JSON.stringify(skip));
      if(page!=="administracion.html"){
      const headerWorks=await evaluate("(async()=>{const mobile=innerWidth<=650,b=document.querySelector('.menu-toggle');if(mobile)b.click();const menus=[...document.querySelectorAll('.primary-nav details')];menus[0].querySelector('summary').click();await new Promise(r=>setTimeout(r,40));const first=menus[0].open;menus[1].querySelector('summary').click();await new Promise(r=>setTimeout(r,40));const exclusive=menus[1].open&&!menus[0].open;const bounds=menus[1].querySelector('.nav-dropdown').getBoundingClientRect();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));const closed=!menus[1].open;const account=document.querySelector('.account-disclosure');account.querySelector('summary').click();await new Promise(r=>setTimeout(r,40));const accountOpen=account.open;const ab=account.querySelector('.nav-dropdown').getBoundingClientRect();account.querySelector('[data-open-favorites]').click();const favorites=document.querySelector('.catalog-dialog').open&&document.querySelector('.catalog-search-tools input').checked;document.querySelector('.catalog-close').click();if(b.getAttribute('aria-expanded')==='true')b.click();return first&&exclusive&&closed&&accountOpen&&favorites&&bounds.left>=-1&&bounds.right<=innerWidth+1&&ab.left>=-1&&ab.right<=innerWidth+1})()");
      assert.equal(headerWorks,true,page+" header disclosures");
      }
      if(page==="login.html"||page==="registro.html"){
        const valid=await evaluate("(()=>{const f=document.querySelector('[data-auth-form]');f.requestSubmit();return !!f.querySelector('[aria-invalid=true]')})()");
        assert.equal(valid,true,page+" empty-form validation");
      }
      if(page==="index.html"){
        assert.equal(await evaluate("document.querySelectorAll(\".flash-card\").length===4&&document.querySelectorAll(\".best-item\").length===4"),true,"all four catalog products shown on home");
        assert.equal(await evaluate("(()=>{for(const selector of [\".flash-card\",\".best-item\"]){const rows=new Map();for(const card of document.querySelectorAll(selector)){const c=card.getBoundingClientRect(),b=card.querySelector(\".product-select\").getBoundingClientRect();if(Math.abs((b.left+b.right-c.left-c.right)/2)>1)return false;const key=Math.round(c.top);if(rows.has(key)&&Math.abs(rows.get(key)-b.bottom)>1)return false;rows.set(key,b.bottom);} }return true;})()"),true,"centered and row-aligned home product buttons");
        const searchWorks=await evaluate("(()=>{document.querySelector('[aria-label=Buscar]').click();const input=document.querySelector('#catalog-query');if(!input)return false;input.value='tenis gris';input.dispatchEvent(new Event('input'));const found=document.querySelectorAll('.catalog-result').length===1&&document.querySelector('.catalog-result').href.includes('flexible-sneakers-gray');document.querySelector('.catalog-close').click();return found&&!document.querySelector('.catalog-dialog').open})()");
        assert.equal(searchWorks,true,"catalog search and modal");
        assert.equal(await evaluate("document.querySelector('a[href=\\\"/informacion#guide\\\"]')!==null"),true,"footer guide navigation");
      }
      if(page==="sorprendeme.html"){
        const toolsWork=await evaluate("(()=>{const b=document.querySelector('.special-fav'),s=document.querySelector('.special-share');const before=b.getAttribute('aria-pressed');b.click();const changed=b.getAttribute('aria-pressed')!==before;b.click();s.click();const link=document.querySelector('#product-share-url')?.value;document.querySelector('.catalog-close').click();return changed&&b.getAttribute('aria-pressed')===before&&link.includes('producto=flexible-sneakers-gray')})()");
        assert.equal(toolsWork,true,"favorite and share");
        assert.equal(await evaluate("(async()=>{const thumbs=[...document.querySelectorAll('.detail-thumb')];thumbs[1].click();const photo=document.querySelector('#detail-image');await photo.decode();const gallery=photo.src.endsWith('tenis-gris-frontal-310.webp')&&thumbs[1].getAttribute('aria-pressed')==='true';document.querySelector('#detail-plus').click();const quantity=document.querySelector('#detail-quantity').value==='2'&&!document.querySelector('#detail-subtotal');document.querySelector('#detail-minus').click();return gallery&&quantity&&document.querySelector('#detail-related-grid').children.length===3&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"product detail gallery, quantity and related products");
      }
      if(page==="coleccion.html"){
        const catalogWorks=await evaluate("(async()=>{const f=document.querySelector('#collection-filters'),q=document.querySelector('#collection-query'),sort=document.querySelector('#collection-sort'),cards=()=>[...document.querySelectorAll('.product-card:not([hidden])')];const initial=cards().length===4;q.value='gris';q.dispatchEvent(new Event('input',{bubbles:true}));const match=cards().length===1&&cards()[0].dataset.product==='flexible-sneakers-gray';q.value='zzzz';q.dispatchEvent(new Event('input',{bubbles:true}));const empty=!document.querySelector('#collection-empty').hidden;f.reset();await Promise.resolve();sort.value='desc';sort.dispatchEvent(new Event('change'));const ordered=cards()[0].dataset.product==='martin-dingman-brown'&&cards().at(-1).dataset.product==='casual-boots-brown';f.reset();await Promise.resolve();const size=document.querySelector('#collection-size');size.value='26';size.dispatchEvent(new Event('input',{bubbles:true}));const sizeWorks=!size.disabled&&cards().length===1&&cards()[0].dataset.product==='flexible-sneakers-gray';f.reset();await Promise.resolve();return initial&&match&&empty&&ordered&&sizeWorks&&document.documentElement.scrollWidth<=innerWidth+2})()");
        assert.equal(catalogWorks,true,"catalog filters and empty state");
      }
      if(page==="index.html"||page==="coleccion.html"){
        const linked=await evaluate("(()=>{const cards=[...document.querySelectorAll('.flash-card,.best-item,.product-card')];return cards.length>0&&cards.every(c=>c.querySelector('.product-select[href]'))})()");
        assert.equal(linked,true,page+" product selection links");
      }
      if(page==="carrito.html"){
        const ok=await evaluate("(async()=>{const key='shoefit.cart.v1';const old=localStorage.getItem(key);try{localStorage.setItem(key,JSON.stringify([{id:'flexible-sneakers-gray',size:'26',quantity:1}]));dispatchEvent(new StorageEvent('storage',{key}));const plus=document.querySelector('[data-action=plus]');if(!plus)return false;plus.click();const count=document.querySelector('#cart-count').textContent;const total=document.querySelector('#cart-total').textContent;const noOverflow=document.documentElement.scrollWidth<=innerWidth+2;document.querySelector('.cart-remove').click();return count==='2 artículos'&&total.includes('4,980')&&noOverflow&&!document.querySelector('#cart-empty').hidden;}finally{if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);dispatchEvent(new StorageEvent('storage',{key}));}})()");
        assert.equal(ok,true,page+" cart operations");
      }
      if(page==="pedido.html")assert.equal(await evaluate("(async()=>{const key='shoefit.cart.v1',old=localStorage.getItem(key);try{localStorage.setItem(key,JSON.stringify([{id:'flexible-sneakers-gray',size:'26',quantity:2},{id:'martin-dingman-brown',size:'27',quantity:1}]));dispatchEvent(new StorageEvent('storage',{key}));const preview=document.querySelector('#checkout-preview');const summary=document.querySelector('#checkout-items').children.length===2&&document.querySelector('#checkout-total').textContent.includes('8,980')&&document.querySelector('#checkout-count').textContent==='3 artículos';preview.click();const opened=document.querySelector('#checkout-dialog').open;document.querySelector('#checkout-close').click();localStorage.removeItem(key);dispatchEvent(new StorageEvent('storage',{key}));return summary&&opened&&!document.querySelector('#checkout-dialog').open&&!document.querySelector('#checkout-empty').hidden&&preview.disabled&&document.querySelector('.checkout-confirm').disabled&&[...document.querySelectorAll('.checkout-fields input,.checkout-fields textarea')].every(e=>e.disabled)&&document.documentElement.scrollWidth<=innerWidth+2;}finally{if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);dispatchEvent(new StorageEvent('storage',{key}));}})()"),true,"checkout preview, summary and empty state");
      if(page==="cuenta.html")assert.equal(await evaluate("(async()=>{const key='shoefit.favorites.v1',old=localStorage.getItem(key);try{localStorage.setItem(key,JSON.stringify(['flexible-sneakers-gray']));dispatchEvent(new StorageEvent('storage',{key}));document.querySelector('[data-account-tab=favoritos]').click();await new Promise(r=>setTimeout(r,80));const shown=!document.querySelector('#favoritos').hidden&&document.querySelector('#perfil').hidden&&document.querySelectorAll('.account-favorite-card').length===1;document.querySelector('.account-favorite-card button').click();const removed=!document.querySelector('#account-favorites-empty').hidden;document.querySelector('[data-account-tab=pedidos]').click();await new Promise(r=>setTimeout(r,80));const orders=!document.querySelector('#pedidos').hidden;return shown&&removed&&orders&&[...document.querySelectorAll('.account-fields input')].every(e=>e.disabled)&&document.documentElement.scrollWidth<=innerWidth+2;}finally{if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);dispatchEvent(new StorageEvent('storage',{key}));}})()"),true,"account tabs, local favorites and preview safety");
      if(page==="recuperar.html")assert.equal(await evaluate("!document.querySelector('#recovery-form input[name=email]').disabled&&document.querySelector('#recovery-step').hidden&&document.querySelector('#recovery-form input[name=password]').disabled"),true,"recovery initial form safety");
      if(page==="informacion.html")assert.equal(await evaluate("(()=>{const guide=document.querySelector('#guide');const q=document.querySelector('#faq details');q.querySelector('summary').click();const opened=q.open;q.querySelector('summary').click();return !!guide&&guide.querySelectorAll('li').length===4&&opened&&!q.open&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"information guide and FAQ");
      if(page==="administracion.html")assert.equal(await evaluate("(async()=>{for(const key of ['productos','clientes','ventas','empleados','proveedores','variantes','pedidos']){document.querySelector('[data-module='+key+']').click();await new Promise(r=>setTimeout(r,70));if(document.querySelector('#'+key).hidden||!document.querySelector('#'+key+' .admin-table')||![...document.querySelectorAll('[data-admin-action]')].every(b=>b.disabled))return false;}return document.documentElement.scrollWidth<=innerWidth+2})()"),true,"seven admin modules fail closed without API");
      if(page==="administracion.html")assert.equal(await evaluate("(async()=>{const link=document.querySelector('[data-module=ventas]');link.click();await new Promise(r=>setTimeout(r,80));return !document.querySelector('#ventas').hidden&&link.getAttribute('aria-current')==='true'&&document.querySelector('#admin-current-module').textContent==='Ventas'&&document.querySelector('#admin-workspace-title').textContent==='Ventas'&&!document.querySelector('.admin-overview,[data-admin-shortcut]')&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"sidebar-only module navigation and workspace");
      if(page==="administracion.html"){const toggle=await evaluate("(async()=>{const b=document.querySelector('#admin-sidebar-toggle'),s=document.querySelector('#admin-sidebar'),layout=document.querySelector('.management-layout'),content=document.querySelector('.management-content');const pos=()=>{const r=content.getBoundingClientRect(),l=layout.getBoundingClientRect();return {top:r.top-l.top,left:r.left-l.left,width:r.width}};const before=pos();const initial=!document.querySelector('.site-header')&&!s.hidden&&b.getAttribute('aria-expanded')==='true';b.focus({preventScroll:true});b.click();await new Promise(r=>setTimeout(r,80));const after=pos();const hidden=s.hidden&&getComputedStyle(s).display==='none'&&b.getAttribute('aria-expanded')==='false'&&layout.classList.contains('admin-sidebar-collapsed');const accessible=b.getBoundingClientRect().width>0&&document.activeElement===b;const expanded=innerWidth<=760?after.top<before.top:after.width>before.width;const noOverflow=document.documentElement.scrollWidth<=innerWidth+2;b.click();await new Promise(r=>setTimeout(r,80));return {initial,hidden,accessible,expanded,noOverflow,restored:!s.hidden&&b.getAttribute('aria-expanded')==='true'&&!layout.classList.contains('admin-sidebar-collapsed')&&document.documentElement.scrollWidth<=innerWidth+2,before,after}})()");assert.ok(toggle.initial&&toggle.hidden&&toggle.accessible&&toggle.expanded&&toggle.noOverflow&&toggle.restored,"standalone admin and sidebar toggle "+JSON.stringify(toggle));}
      else assert.equal(await evaluate("document.querySelector('[aria-label=Carrito]').getAttribute('href')") ,"/carrito",page+" cart navigation");
      console.log(width+"px "+page+" OK ("+state.images+" images)");
    }
    const missing=origin+"/no-existe/prueba-404";
    assert.equal((await fetch(missing)).status,404);
    await call("Page.navigate",{url:missing});
    let missingReady=false;for(let i=0;i<100;i++){try{missingReady=await evaluate("location.href === "+JSON.stringify(missing)+" && document.readyState === 'complete' && document.title.includes('Página no encontrada')");if(missingReady)break;}catch{}await delay(100);}
    assert.ok(missingReady,"custom 404 loaded");
    assert.equal(await evaluate("document.querySelector('.info-error-card a[href=\\\"/\\\"]')!==null&&document.documentElement.scrollWidth<=innerWidth+2"),true,"404 recovery link and layout");
  }
  // Recovery flow against a simulated server; no real email or password changes.
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call("Page.navigate",{url:origin+"/recuperar"});
  let recoveryReady=false;for(let i=0;i<100;i++){try{recoveryReady=await evaluate("location.pathname==='/recuperar' && document.readyState==='complete' && !document.querySelector('#recovery-form button[type=submit]')?.disabled");if(recoveryReady)break;}catch{}await delay(100);}
  assert.ok(recoveryReady,"recovery form loaded");
  assert.equal(await evaluate("(async()=>{const form=document.querySelector('#recovery-form'),step=document.querySelector('#recovery-step'),status=document.querySelector('#recovery-status'),f=form.elements,wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return true;await new Promise(r=>setTimeout(r,50));}return false;};f.email.value='demo@example.invalid';form.requestSubmit();if(!await wait(()=>!step.hidden&&status.textContent.includes('recibirás')))return false;f.code.value='000000';f.password.value='sample-pass';f.confirmation.value='different-pass';form.requestSubmit();if(!status.textContent.includes('no coinciden'))return false;f.confirmation.value=f.password.value;form.requestSubmit();if(!await wait(()=>status.textContent.includes('inválido')))return false;f.code.value='123456';form.requestSubmit();if(!await wait(()=>status.textContent.includes('Contraseña actualizada')))return false;return step.hidden&&f.password.value===''&&f.code.value===''&&f.email.value===''&&!f.email.readOnly})()"),true,"recovery request, password mismatch, invalid code and successful reset");
  assert.equal(recoveryAttempts.length,3);assert.deepEqual(recoveryAttempts.map(x=>x.action),["request","reset","reset"]);assert.equal(recoveryAttempts[1].code,"000000");assert.equal(recoveryAttempts[2].code,"123456");
  console.log("PASS recovery form with simulated API; no real email sent");
  // Independent authenticated checkout simulation (not a live Supabase account).
  checkoutFixture=true;
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call("Page.navigate",{url:origin+"/pedido"});
  for(let i=0;i<100;i++){try{if(await evaluate("location.pathname==='/pedido' && document.documentElement.dataset.catalogState==='ready' && document.querySelector('#checkout-name')?.value==='Cliente prueba'"))break;}catch{}await delay(100);}
  const result=await evaluate("(async()=>{const key='shoefit.cart.v1';localStorage.setItem(key,JSON.stringify([{id:'flexible-sneakers-gray',size:'26',quantity:2}]));dispatchEvent(new StorageEvent('storage',{key}));document.querySelector('#checkout-confirm').click();for(let i=0;i<100&&document.querySelector('#checkout-retry').hidden;i++)await new Promise(r=>setTimeout(r,50));const retry=document.querySelector('#checkout-retry');if(retry.hidden)return false;retry.click();for(let i=0;i<100&&!document.querySelector('#checkout-dialog').open;i++)await new Promise(r=>setTimeout(r,50));return document.querySelector('#checkout-dialog-title').textContent==='Pedido #123'&&JSON.parse(localStorage.getItem(key)).length===0&&localStorage.getItem('shoefit.checkout.pending.v1.999')===null})()");
  assert.equal(result,true,"authenticated checkout retry and confirmation");
  assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);assert.deepEqual(attempts[0].items,[{id_variante:7,cantidad:2}]);
  console.log("PASS checkout uses identical idempotency key after ambiguous response and clears purchased cart");
  await call("Page.navigate",{url:origin+"/cuenta"});
  for(let i=0;i<100;i++){try{if(await evaluate("location.pathname==='/cuenta' && document.querySelector('#profile-nombre')?.value==='Cliente prueba'"))break;}catch{}await delay(100);}
  const profileResult=await evaluate("(async()=>{document.querySelector('#profile-nombre').value='Cliente actualizado';document.querySelector('#profile-save').click();for(let i=0;i<100&&!document.querySelector('#profile-status').textContent.includes('guardados');i++)await new Promise(r=>setTimeout(r,50));return document.querySelector('.account-name').textContent==='Cliente actualizado'&&document.querySelector('#profile-mail').disabled})()");
  assert.equal(profileResult,true,"profile update from UI");assert.deepEqual(profilePatch,{nombre:"Cliente actualizado"});
  const orderResult=await evaluate("(async()=>{document.querySelector('[data-account-tab=pedidos]').click();for(let i=0;i<100&&!document.querySelector('#account-orders button');i++)await new Promise(r=>setTimeout(r,50));if(!document.querySelector('#account-orders button'))return false;window.confirm=()=>true;document.querySelector('#account-orders button').click();for(let i=0;i<100&&!document.querySelector('#account-orders').textContent.includes('Cancelado');i++)await new Promise(r=>setTimeout(r,50));return document.querySelector('#account-orders').textContent.includes('Cancelado')&&!document.querySelector('#account-orders button')})()");
  assert.equal(orderResult,true,"customer order cancellation");assert.deepEqual(orderPatch,{id:123,estado:"cancelado"});
  console.log("PASS account profile edit and order cancellation with simulated authenticated API");
  adminFixture=true;await call("Page.navigate",{url:origin+"/administracion"});
  for(let i=0;i<100;i++){try{if(await evaluate("location.pathname==='/administracion' && !document.querySelector('[data-admin-action=add]')?.disabled"))break;}catch{}await delay(100);}
  const adminResult=await evaluate("(async()=>{const wait=async f=>{for(let i=0;i<100;i++){if(f())return true;await new Promise(r=>setTimeout(r,50));}return false;},btn=a=>document.querySelector('[data-admin-action='+a+']'),commit=document.querySelector('#admin-commit'),field=k=>document.querySelector('[data-column='+k+']'),table=()=>document.querySelector('#productos tbody');btn('add').click();if(!await wait(()=>!commit.disabled))return false;field('nom_prod').value='Producto nuevo';field('slug').value='producto-nuevo';field('precio').value='120';field('activo').checked=true;commit.click();if(!await wait(()=>table().textContent.includes('Producto nuevo')&&!btn('edit').disabled))return false;const pick=()=>{const radio=table().querySelector('[aria-label=\"Seleccionar registro 2\"]');radio.click();};pick();btn('edit').click();if(!await wait(()=>!commit.disabled))return false;field('precio').value='130';commit.click();if(!await wait(()=>table().textContent.includes('130')&&!btn('delete').disabled))return false;pick();btn('delete').click();if(!await wait(()=>!commit.disabled))return false;commit.click();if(!await wait(()=>!document.querySelector('#admin-dialog').open&&!btn('add').disabled&&!table().textContent.includes('Producto nuevo')))return false;document.querySelector('[data-module=clientes]').click();if(!await wait(()=>document.querySelector('#clientes').hidden===false&&getComputedStyle(document.querySelector('.management-actions')).display==='none'))return false;document.querySelector('[data-module=pedidos]').click();if(!await wait(()=>!document.querySelector('#pedidos').hidden&&getComputedStyle(document.querySelector('.management-actions')).display==='none'&&!document.querySelector('#admin-order-actions').hidden))return false;document.querySelector('[data-module=productos]').click();if(!await wait(()=>getComputedStyle(document.querySelector('.management-actions')).display!=='none'))return false;location.hash='usuarios';return await wait(()=>location.hash==='#productos'&&!document.querySelector('[data-module=usuarios]')&&!document.querySelector('#usuarios'))})()");
  assert.equal(adminResult,true,"admin real controls simulated CRUD");assert.deepEqual(adminChanges.map(x=>x.method),["POST","PATCH","DELETE"]);assert.deepEqual(adminChanges[1].body,{precio:130});assert.equal(adminChanges[2].id,2);
  console.log("PASS administrative create, update, delete and read-only users using simulated protected API");
} finally {
  socket?.close();chrome?.kill();server.close();await delay(300);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
