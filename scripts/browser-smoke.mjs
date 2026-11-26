import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, relative } from "node:path";
import assert from "node:assert/strict";
import {regularPages} from "./frontend-manifest.mjs";
const root=resolve("dist");
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,"http://localhost").pathname;
    const path=resolve(root,"."+ (pathname==="/"?"/index.html":pathname));
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
  // External fonts are intentionally excluded; check the local application without network dependencies.
  await call("Network.setBlockedURLs",{urls:["*fonts.googleapis.com/*","*fonts.gstatic.com/*"]});
  const pages=regularPages;
  for(const width of [1366,1024,820,650,390,320]){
    await call("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width<=650});
    for(const page of pages){
      const url=origin+"/"+page;
      await call("Page.navigate",{url});
      let ready=false;
      for(let i=0;i<100;i++){try{ready=await evaluate("location.href === "+JSON.stringify(url)+" && document.readyState === 'complete'");if(ready)break}catch{}await delay(100)}
      assert.ok(ready,"Page failed to load "+page);
      const state=await evaluate("(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.allSettled(imgs.map(i=>i.decode()));return {width:innerWidth,scroll:document.documentElement.scrollWidth,images:imgs.length,broken:imgs.filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),styles:[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>!l.href.includes('googleapis')).every(l=>!!l.sheet),title:document.title}})()");
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
        const searchWorks=await evaluate("(()=>{document.querySelector('[aria-label=Buscar]').click();const input=document.querySelector('#catalog-query');if(!input)return false;input.value='tenis gris';input.dispatchEvent(new Event('input'));const found=document.querySelectorAll('.catalog-result').length===1&&document.querySelector('.catalog-result').href.includes('flexible-sneakers-gray');document.querySelector('.catalog-close').click();return found&&!document.querySelector('.catalog-dialog').open})()");
        assert.equal(searchWorks,true,"catalog search and modal");
        assert.equal(await evaluate("document.querySelector('a[href=\\\"informacion.html#guide\\\"]')!==null"),true,"footer guide navigation");
      }
      if(page==="sorprendeme.html"){
        const toolsWork=await evaluate("(()=>{const b=document.querySelector('.special-fav'),s=document.querySelector('.special-share');const before=b.getAttribute('aria-pressed');b.click();const changed=b.getAttribute('aria-pressed')!==before;b.click();s.click();const link=document.querySelector('#product-share-url')?.value;document.querySelector('.catalog-close').click();return changed&&b.getAttribute('aria-pressed')===before&&link.includes('producto=flexible-sneakers-gray')})()");
        assert.equal(toolsWork,true,"favorite and share");
        assert.equal(await evaluate("(async()=>{const thumbs=[...document.querySelectorAll('.detail-thumb')];thumbs[1].click();const photo=document.querySelector('#detail-image');await photo.decode();const gallery=photo.src.endsWith('tenis-gris-frontal-310.webp')&&thumbs[1].getAttribute('aria-pressed')==='true';document.querySelector('#detail-plus').click();const quantity=document.querySelector('#detail-quantity').value==='2'&&document.querySelector('#detail-subtotal').textContent.includes('4,980');document.querySelector('#detail-minus').click();return gallery&&quantity&&document.querySelector('#detail-related-grid').children.length===3&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"product detail gallery, quantity and related products");
      }
      if(page==="coleccion.html"){
        const catalogWorks=await evaluate("(async()=>{const f=document.querySelector('#collection-filters'),q=document.querySelector('#collection-query'),sort=document.querySelector('#collection-sort'),cards=()=>[...document.querySelectorAll('.product-card:not([hidden])')];const initial=cards().length===4;q.value='gris';q.dispatchEvent(new Event('input',{bubbles:true}));const match=cards().length===1&&cards()[0].dataset.product==='flexible-sneakers-gray';q.value='zzzz';q.dispatchEvent(new Event('input',{bubbles:true}));const empty=!document.querySelector('#collection-empty').hidden;f.reset();await Promise.resolve();sort.value='desc';sort.dispatchEvent(new Event('change'));const ordered=cards()[0].dataset.product==='martin-dingman-brown'&&cards().at(-1).dataset.product==='casual-boots-brown';f.reset();await Promise.resolve();return initial&&match&&empty&&ordered&&document.querySelector('#collection-size').disabled&&document.documentElement.scrollWidth<=innerWidth+2})()");
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
      if(page==="recuperar.html")assert.equal(await evaluate("document.querySelector('.account-fields input').disabled&&document.querySelector('.account-recovery-card button').disabled"),true,"recovery preview safety");
      if(page==="informacion.html")assert.equal(await evaluate("(()=>{const guide=document.querySelector('#guide');const q=document.querySelector('#faq details');q.querySelector('summary').click();const opened=q.open;q.querySelector('summary').click();return !!guide&&guide.querySelectorAll('li').length===4&&opened&&!q.open&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"information guide and FAQ");
      if(page==="administracion.html")assert.equal(await evaluate("(async()=>{for(const key of ['productos','clientes','ventas','empleados']){document.querySelector('[data-module='+key+']').click();await new Promise(r=>setTimeout(r,70));if(document.querySelector('#'+key).hidden||!document.querySelector('#'+key+' .admin-table'))return false;for(const action of ['add','edit','delete']){document.querySelector('[data-admin-action='+action+']').click();const d=document.querySelector('#admin-dialog');if(!d.open||!document.querySelector('#admin-commit').disabled||![...d.querySelectorAll('input,select')].every(e=>e.disabled))return false;if(action==='delete'&&!d.querySelector('.admin-delete-note'))return false;document.querySelector('#admin-cancel').click();}}return document.documentElement.scrollWidth<=innerWidth+2})()"),true,"four admin modules and 12 operation previews");
      if(page==="administracion.html")assert.equal(await evaluate("(async()=>{const shortcut=document.querySelector('[data-admin-shortcut=ventas]');shortcut.click();await new Promise(r=>setTimeout(r,80));return !document.querySelector('#ventas').hidden&&shortcut.getAttribute('aria-current')==='true'&&document.querySelector('#admin-current-module').textContent==='Ventas'&&document.querySelector('#admin-workspace-title').textContent==='Ventas'&&document.querySelectorAll('.admin-overview-card').length===4&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"dashboard overview navigation and workspace");
      if(page==="administracion.html")assert.equal(await evaluate("(()=>{const b=document.querySelector('#admin-sidebar-toggle'),s=document.querySelector('#admin-sidebar'),layout=document.querySelector('.management-layout'),content=document.querySelector('.management-content');if(document.querySelector('.site-header')||!b||!s||s.hidden||b.getAttribute('aria-expanded')!=='true')return false;const before=content.getBoundingClientRect();b.focus();b.click();const after=content.getBoundingClientRect();const hidden=s.hidden&&getComputedStyle(s).display==='none'&&b.getAttribute('aria-expanded')==='false'&&layout.classList.contains('admin-sidebar-collapsed')&&b.getBoundingClientRect().width>0&&(innerWidth<=760?after.top<before.top:after.width>before.width)&&document.activeElement===b&&document.documentElement.scrollWidth<=innerWidth+2;b.click();return hidden&&!s.hidden&&b.getAttribute('aria-expanded')==='true'&&!layout.classList.contains('admin-sidebar-collapsed')&&document.documentElement.scrollWidth<=innerWidth+2})()"),true,"standalone admin and sidebar toggle");
      else assert.equal(await evaluate("document.querySelector('[aria-label=Carrito]').getAttribute('href')"),"carrito.html",page+" cart navigation");
      console.log(width+"px "+page+" OK ("+state.images+" images)");
    }
    const missing=origin+"/no-existe/prueba-404";
    assert.equal((await fetch(missing)).status,404);
    await call("Page.navigate",{url:missing});
    let missingReady=false;for(let i=0;i<100;i++){try{missingReady=await evaluate("location.href === "+JSON.stringify(missing)+" && document.readyState === 'complete' && document.title.includes('Página no encontrada')");if(missingReady)break;}catch{}await delay(100);}
    assert.ok(missingReady,"custom 404 loaded");
    assert.equal(await evaluate("document.querySelector('.info-error-card a[href=\\\"/index.html\\\"]')!==null&&document.documentElement.scrollWidth<=innerWidth+2"),true,"404 recovery link and layout");
  }
} finally {
  socket?.close();chrome?.kill();server.close();await delay(300);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
