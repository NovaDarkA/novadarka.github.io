import {CART_KEY,normalize,totals} from "./cart.js";
import {getProduct} from "./products.js";
const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100)+" MXN";
const read=()=>{try{return normalize(JSON.parse(localStorage.getItem(CART_KEY)||"[]"));}catch{return [];}};
const list=document.getElementById("checkout-items");
const preview=document.getElementById("checkout-preview"),dialog=document.getElementById("checkout-dialog");
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function render(){
 const rows=read(),{count,cents}=totals(rows);
 document.getElementById("checkout-count").textContent=count+" "+(count===1?"artículo":"artículos");
 document.getElementById("checkout-subtotal").textContent=money(cents);
 document.getElementById("checkout-total").textContent=money(cents);
 document.getElementById("checkout-empty").hidden=count>0;
 preview.disabled=count===0;
 list.replaceChildren();
 for(const row of rows){
   const product=getProduct(row.id);
   const card=node("article","checkout-item"),img=node("img");
   img.src=product.image;img.alt=product.name;
   const info=node("div");
   info.append(node("h3",null,product.name),node("p",null,"Talla "+row.size+" MX · Cantidad "+row.quantity),node("strong",null,money(row.quantity*product.priceCents)));
   card.append(img,info);list.append(card);
 }
}
preview.addEventListener("click",()=>{if(totals(read()).count>0)dialog.showModal();});
document.getElementById("checkout-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>preview.focus());
window.addEventListener("storage",e=>{if(e.key===CART_KEY||e.key===null)render();});
window.addEventListener("pageshow",render);render();
