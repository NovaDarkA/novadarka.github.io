import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, relative } from "node:path";
import assert from "node:assert/strict";
const root=resolve("dist");
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,"http://localhost").pathname;
    const path=resolve(root,"."+ (pathname==="/"?"/index.html":pathname));
    if(relative(root,path).startsWith("..")) {res.writeHead(403).end();return;}
    res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");
    res.end(await readFile(path));
  } catch {res.writeHead(404).end();}
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
  const pages=["index.html","coleccion.html","sorprendeme.html","login.html","registro.html","administracion.html","carrito.html"];
  for(const width of [1366,390]){
    await call("Emulation.setDeviceMetricsOverride",{width,height:844,deviceScaleFactor:1,mobile:width===390});
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
      if(width===390) {
        const menu=await evaluate("(()=>{const b=document.querySelector('.menu-toggle'),n=document.querySelector('#primary-nav');if(!b||!n)return false;b.click();const open=b.getAttribute('aria-expanded')==='true'&&n.classList.contains('is-open');b.click();return open&&b.getAttribute('aria-expanded')==='false'&&!n.classList.contains('is-open')})()");
        assert.equal(menu,true,page+" mobile menu");
      }
      if(page==="login.html"||page==="registro.html"){
        const valid=await evaluate("(()=>{const f=document.querySelector('[data-auth-form]');f.requestSubmit();return !!f.querySelector('[aria-invalid=true]')})()");
        assert.equal(valid,true,page+" empty-form validation");
      }
      if(page==="carrito.html"){
        const ok=await evaluate("(async()=>{const key='shoefit.cart.v1';const old=localStorage.getItem(key);try{localStorage.setItem(key,JSON.stringify([{id:'flexible-sneakers-gray',size:'26',quantity:1}]));dispatchEvent(new StorageEvent('storage',{key}));const plus=document.querySelector('[data-action=plus]');if(!plus)return false;plus.click();const count=document.querySelector('#cart-count').textContent;const total=document.querySelector('#cart-total').textContent;const noOverflow=document.documentElement.scrollWidth<=innerWidth+2;document.querySelector('.cart-remove').click();return count==='2 artículos'&&total.includes('4,980')&&noOverflow&&!document.querySelector('#cart-empty').hidden;}finally{if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);dispatchEvent(new StorageEvent('storage',{key}));}})()");
        assert.equal(ok,true,page+" cart operations");
      }
      if(page==="administracion.html"){
        const works=await evaluate("(async()=>{document.querySelector('[data-module=clientes]').click();await new Promise(r=>setTimeout(r,150));return !document.querySelector('#clientes').hidden&&document.querySelector('#productos').hidden&&[...document.querySelectorAll('.management-actions button')].every(b=>b.disabled)})()");
        assert.equal(works,true,page+" module navigation");
      }
      assert.equal(await evaluate("document.querySelector('[aria-label=Carrito]').getAttribute('href')"),"carrito.html",page+" cart navigation");
      console.log(width+"px "+page+" OK ("+state.images+" images)");
    }
  }
} finally {
  socket?.close();chrome?.kill();server.close();await delay(300);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
