import {CART_KEY,normalize,totals} from "./cart.js";
import {getProduct,setImage,catalogAvailable,money} from "./products.js";
import {prepareOrder,fingerprint,subtractPurchased} from "./order-client.js";
const PENDING="shoefit.checkout.pending.v1";
const read=()=>{try{return normalize(JSON.parse(localStorage.getItem(CART_KEY)||"[]"));}catch{return [];}};
const list=document.getElementById("checkout-items");
const preview=document.getElementById("checkout-preview"),dialog=document.getElementById("checkout-dialog"),confirm=document.getElementById("checkout-confirm"),status=document.getElementById("checkout-status"),retry=document.getElementById("checkout-retry");
let profile=null,busy=false;
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function pending(){try{const p=JSON.parse(localStorage.getItem(PENDING)||"null");return p&&p.user===profile?.id_user&&typeof p.key==="string"&&Array.isArray(p.items)&&Array.isArray(p.rows)?p:null;}catch{return null;}}
function render(){
 const rows=read(),{count,cents}=totals(rows),previous=pending();
 document.getElementById("checkout-count").textContent=count+" "+(count===1?"artículo":"artículos");
 document.getElementById("checkout-subtotal").textContent=money(cents);
 document.getElementById("checkout-total").textContent=money(cents);
 document.getElementById("checkout-empty").hidden=count>0;
 preview.disabled=count===0||busy;
 confirm.disabled=busy||!catalogAvailable||!profile||count===0||!!previous;
 retry.hidden=!previous;retry.disabled=busy||!profile;
 list.replaceChildren();
 for(const row of rows){
  const product=getProduct(row.id);
  const card=node("article","checkout-item"),img=node("img");setImage(img,product);
  const info=node("div");info.append(node("h3",null,product.name),node("p",null,"Talla "+row.size+" MX · Cantidad "+row.quantity),node("strong",null,money(row.quantity*product.priceCents)));
  card.append(img,info);list.append(card);
 }
}
async function loadProfile(){
 try{
  const r=await fetch("/api/profile",{cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!r.ok){status.textContent=r.status===401?"Inicia sesión como cliente para confirmar tu pedido.":r.status===403?"Utiliza una cuenta de cliente.":"No se pudo consultar tu cuenta.";return;}
  const {data}=await r.json();if(data?.rolez!=="cliente"||!Number.isInteger(data.id_user))throw Error();
  profile=data;
  document.getElementById("checkout-name").value=[data.nombre,data.ap,data.am].filter(Boolean).join(" ");
  document.getElementById("checkout-email").value=data.mail||"";
  document.getElementById("checkout-address").value=[data.calle,data.numero].filter(Boolean).join(" ");
  document.getElementById("checkout-postal").value=data.cp||"";
  document.getElementById("checkout-colony").value=data.colonia||"";
  document.getElementById("checkout-login").hidden=true;
  status.textContent=pending()?"Hay un intento anterior pendiente de confirmación. Reintenta el mismo pedido para evitar duplicados.":"Revisa los artículos antes de confirmar. No se realizará ningún cobro.";
 }catch{status.textContent="No se pudo consultar tu cuenta. Recarga la página.";}finally{render();}
}
async function submit(reuse=false){
 if(busy||!profile)return;
 busy=true;render();status.textContent="Verificando pedido…";
 try{
  let attempt=pending();
  if(!attempt){
   if(reuse)throw Error("no_pending");
   const rows=read();const snapshot=fingerprint(rows);
   const items=await prepareOrder(rows,getProduct);
   if(fingerprint(read())!==snapshot)throw Error("cart_changed");
   attempt={user:profile.id_user,key:crypto.randomUUID(),items,rows};
   // Persist before the request so an interrupted response cannot cause a duplicate.
   localStorage.setItem(PENDING,JSON.stringify(attempt));
  }
  status.textContent="Registrando pedido…";
  const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:attempt.key,items:attempt.items}),signal:AbortSignal.timeout(20000)});
  if(r.status===409||r.status===400){localStorage.removeItem(PENDING);throw Error(r.status===409?"stock_conflict":"invalid_cart");}
  if(r.status===401||r.status===403)throw Error("session_required");
  if(!r.ok)throw Error("unknown_result");
  const {data}=await r.json();if(!Number.isInteger(data?.id_pedido)||typeof data.costo!=="number"||!["pendiente","cancelado","entregado"].includes(data.estado))throw Error("unknown_result");
  // Remove only quantities covered by the successful order, not unrelated additions.
  const remaining=subtractPurchased(read(),attempt.rows);
  localStorage.setItem(CART_KEY,JSON.stringify(remaining));localStorage.removeItem(PENDING);
  window.dispatchEvent(new StorageEvent("storage",{key:CART_KEY}));
  document.getElementById("checkout-dialog-title").textContent="Pedido #"+data.id_pedido;
  document.getElementById("checkout-dialog-message").textContent="Estado: "+data.estado+". Total registrado: "+money(Math.round(data.costo*100))+".";
  document.getElementById("checkout-dialog-note").textContent="El pedido está registrado en Shoefit. No se realizó ningún cobro.";
  document.getElementById("checkout-close").textContent="Cerrar";
  status.textContent="Pedido registrado correctamente.";
  if(!dialog.open)dialog.showModal();
 }catch(error){
  const messages={price_changed:"El precio cambió. Recarga la página y revisa el nuevo total.",stock_unavailable:"No hay existencias suficientes. Revisa el carrito.",availability_unavailable:"No se pudo confirmar el inventario.",stock_conflict:"El inventario cambió o el pedido no se pudo confirmar. Revisa el carrito.",invalid_cart:"Revisa los artículos y cantidades.",cart_changed:"El carrito cambió durante la revisión. Intenta nuevamente.",session_required:"Tu sesión no está disponible. Inicia sesión y reintenta el mismo pedido.",unknown_result:"No se pudo confirmar la respuesta. Reintenta el mismo pedido; no se duplicará."};
  status.textContent=messages[error.message]||"No se pudo completar el pedido. Si hay un intento pendiente, reinténtalo.";
 }finally{busy=false;render();}
}
preview.addEventListener("click",()=>{if(totals(read()).count>0){document.getElementById("checkout-dialog-title").textContent="Revisión del pedido";document.getElementById("checkout-dialog-message").textContent="Comprueba los productos y el total antes de confirmar.";document.getElementById("checkout-dialog-note").textContent="Esta revisión no registra ningún pedido ni efectúa un pago.";document.getElementById("checkout-close").textContent="Volver a la revisión";dialog.showModal();}});
confirm.addEventListener("click",()=>submit());retry.addEventListener("click",()=>submit(true));
document.getElementById("checkout-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>{if(!preview.disabled)preview.focus();});
window.addEventListener("storage",e=>{if(e.key===CART_KEY||e.key===PENDING||e.key===null)render();});
window.addEventListener("pageshow",render);render();loadProfile();
