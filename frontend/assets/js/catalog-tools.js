import {getProduct,PRODUCT,searchProducts,setImage} from "./products.js";
const KEY="shoefit.favorites.v1";
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?[...new Set(v.filter(id=>getProduct(id)))]:[];}catch{return [];}};
const selected=()=>{const id=new URLSearchParams(location.search).get("producto");return id===null?PRODUCT:getProduct(id);};
const money=n=>n===null?"Precio por confirmar":new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100)+" MXN";
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(text,cls){const b=el("button",cls,text);b.type="button";return b;}
const dialog=el("dialog","catalog-dialog");
dialog.setAttribute("aria-labelledby","catalog-dialog-title");
const heading=el("div","catalog-dialog-heading");
const title=el("h2",null,"Buscar productos");title.id="catalog-dialog-title";
const close=button("×","catalog-close");close.setAttribute("aria-label","Cerrar");
close.addEventListener("click",()=>dialog.close());heading.append(title,close);
const body=el("div","catalog-dialog-body");
dialog.append(heading,body);document.body.append(dialog);
let opener;
dialog.addEventListener("close",()=>opener?.focus());
function open(label,source){if(dialog.open)dialog.close();opener=source;title.textContent=label;body.replaceChildren();dialog.showModal();}
const searchButton=document.querySelector('button[aria-label="Buscar"]');
function openSearch(source,onlyFavorites=false){
 open(onlyFavorites?"Mis favoritos":"Buscar productos",source);
 const label=el("label",null,"Nombre, tipo o color");label.htmlFor="catalog-query";
 const input=el("input","catalog-query");input.id="catalog-query";input.type="search";input.placeholder="Ej. tenis gris";
 const tools=el("div","catalog-search-tools");
 const filterLabel=el("label",null," Solo favoritos");const filter=el("input");filter.type="checkbox";filter.checked=onlyFavorites;filterLabel.prepend(filter);
 tools.append(filterLabel);
 const count=el("p","catalog-count");count.setAttribute("role","status");
 const results=el("ul","catalog-results");
 body.append(label,input,tools,count,results);
 function render(){
   const items=searchProducts(input.value,filter.checked?read():null);
   count.textContent=items.length+" "+(items.length===1?"producto":"productos");
   results.replaceChildren();
   for(const p of items){
     const li=el("li");const a=el("a","catalog-result");a.href="/sorprendeme?producto="+encodeURIComponent(p.id);
     const img=el("img");setImage(img,p);img.alt="";
     const details=el("span");details.append(el("strong",null,p.name),el("small",null,money(p.priceCents)));
     a.append(img,details);li.append(a);results.append(li);
   }
   if(!items.length)results.append(el("li","catalog-no-results","No se encontraron productos."));
 }
 input.addEventListener("input",render);filter.addEventListener("change",render);render();input.focus();
}
searchButton?.addEventListener("click",()=>openSearch(searchButton));
const favoritesButton=document.querySelector("[data-open-favorites]");
favoritesButton?.addEventListener("click",()=>{const account=favoritesButton.closest("details");const summary=account.querySelector("summary");account.open=false;openSearch(summary,true);});
const favorite=document.querySelector(".special-fav");
if(favorite){
 const product=selected();
 const update=()=>{const active=!!product&&read().includes(product.id);favorite.setAttribute("aria-pressed",String(active));favorite.setAttribute("aria-label",active?"Quitar de favoritos":"Añadir a favoritos");};
 favorite.addEventListener("click",()=>{
   if(!product)return;
   let ids=read();ids=ids.includes(product.id)?ids.filter(id=>id!==product.id):[...ids,product.id];
   try{localStorage.setItem(KEY,JSON.stringify(ids));update();}catch{document.getElementById("cart-product-status").textContent="No fue posible guardar los favoritos en este navegador.";}
 });
 window.addEventListener("storage",e=>{if(e.key===KEY||e.key===null)update()});update();
}
const share=document.querySelector(".special-share");
share?.addEventListener("click",()=>{
 const product=selected();if(!product)return;
 const url=new URL("/sorprendeme",location.href);url.searchParams.set("producto",product.id);
 open("Compartir producto",share);
 const label=el("label",null,product.name);label.htmlFor="product-share-url";
 const input=el("input","catalog-query");input.id="product-share-url";input.value=url.href;input.readOnly=true;
 const copy=button("Copiar enlace","catalog-button");const status=el("p","catalog-count");status.setAttribute("role","status");
 copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent="Enlace copiado.";}catch{input.focus();input.select();status.textContent="Selecciona y copia el enlace manualmente.";}});body.append(label,input,copy,status);
});
