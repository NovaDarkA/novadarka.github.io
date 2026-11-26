import {getProduct,setImage} from "./products.js";
const KEY="shoefit.favorites.v1";
const tabs=[...document.querySelectorAll("[data-account-tab]")];
const panels=[...document.querySelectorAll("[data-account-panel]")];
function activate(){
 const key=location.hash.slice(1);
 const selected=panels.some(p=>p.id===key)?key:"perfil";
 for(const p of panels)p.hidden=p.id!==selected;
 for(const t of tabs){if(t.dataset.accountTab===selected)t.setAttribute("aria-current","true");else t.removeAttribute("aria-current");}
}
window.addEventListener("hashchange",activate);activate();
const read=()=>{try{const ids=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(ids)?[...new Set(ids.filter(id=>getProduct(id)))]:[];}catch{return [];}};
const grid=document.getElementById("account-favorites"),status=document.getElementById("account-favorites-status"),empty=document.getElementById("account-favorites-empty");
const money=n=>n===null?"Precio por confirmar":new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100)+" MXN";
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){
 const ids=read();grid.replaceChildren();empty.hidden=ids.length>0;
 status.textContent=ids.length+" "+(ids.length===1?"producto guardado":"productos guardados");
 for(const id of ids){
  const p=getProduct(id),card=el("article","account-favorite-card"),img=el("img");setImage(img,p);
  const name=el("h3",null,p.name),price=el("p",null,money(p.priceCents));
  const link=el("a","account-primary","Ver producto");link.href="sorprendeme.html?producto="+encodeURIComponent(id);
  const remove=el("button","account-secondary","Quitar de favoritos");remove.type="button";
  remove.addEventListener("click",()=>{try{localStorage.setItem(KEY,JSON.stringify(read().filter(v=>v!==id)));render();status.focus();}catch{status.textContent="No se pudo actualizar la lista."; }});
  card.append(img,name,price,link,remove);grid.append(card);
 }
}
status.tabIndex=-1;
window.addEventListener("storage",e=>{if(e.key===KEY||e.key===null)render();});window.addEventListener("pageshow",render);render();
