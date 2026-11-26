import {getProduct,setImage} from "./products.js";
import {profileFields,profileChanges,orderState} from "./account-client.js";
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

const fields=Object.fromEntries(profileFields.map(key=>[key,document.getElementById("profile-"+key)]));
const save=document.getElementById("profile-save"),reset=document.getElementById("profile-reset"),profileStatus=document.getElementById("profile-status"),notice=document.querySelector(".account-notice"),ordersBody=document.getElementById("account-orders"),ordersStatus=document.getElementById("orders-status");
let current=null,saving=false,loadingOrders=false,canceling=false;
function fill(p){for(const key of profileFields)fields[key].value=p[key]??"";document.getElementById("profile-mail").value=p.mail||"";document.querySelector(".account-name").textContent=p.nombre;document.querySelector(".account-sidebar .account-muted").textContent="Sesión iniciada · cliente";document.querySelector("#seguridad .account-security-row:last-child p").textContent="Sesión iniciada.";notice.textContent="Tu cuenta está conectada. Puedes actualizar tus datos y consultar tus pedidos.";}
function toggle(){for(const f of Object.values(fields))f.disabled=!current||saving;save.disabled=reset.disabled=!current||saving;}
async function request(path,options={}){
 const r=await fetch(path,{cache:"no-store",signal:AbortSignal.timeout(15000),...options});
 if(!r.ok){const e=Error(r.status===401?"Inicia sesión nuevamente.":r.status===403?"Esta cuenta no tiene acceso a esta sección.":r.status===409?"El pedido cambió. Actualiza el historial.":"No se pudo completar la operación.");e.status=r.status;throw e;}
 return r.json();
}
async function loadProfile(){
 try{
  const {data}=await request("/api/profile");if(data?.rolez!=="cliente")throw Error("Utiliza una cuenta de cliente.");
  current=data;fill(data);toggle();if(location.hash==="#pedidos")await loadOrders();
 }catch(e){notice.textContent=e.status===401?"Inicia sesión para ver tu información personal.":e.message;}
}
save.addEventListener("click",async()=>{
 if(!current||saving)return;
 try{
  const changes=profileChanges(Object.fromEntries(profileFields.map(k=>[k,fields[k].value])),current);
  if(!Object.keys(changes).length){profileStatus.textContent="No hay cambios pendientes.";return;}
  saving=true;toggle();profileStatus.textContent="Guardando cambios…";
  const {data}=await request("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});
  if(data?.id_user!==current.id_user||data.rolez!=="cliente")throw Error("No se pudo confirmar la actualización.");
  current=data;fill(data);profileStatus.textContent="Cambios guardados correctamente.";
 }catch(e){profileStatus.textContent=e.message;}finally{saving=false;toggle();}
});
reset.addEventListener("click",()=>{if(current&&!saving){fill(current);profileStatus.textContent="Cambios sin guardar descartados.";}});
function orderMessage(message){const tr=el("tr"),td=el("td",null,message);td.colSpan=5;tr.append(td);ordersBody.replaceChildren(tr);}
async function loadOrders(){
 if(!current||loadingOrders)return;
 loadingOrders=true;ordersStatus.textContent="Consultando pedidos…";
 try{
  const {data}=await request("/api/orders");if(!Array.isArray(data))throw Error("No se pudo consultar el historial.");
  ordersBody.replaceChildren();
  if(!data.length)orderMessage("Todavía no tienes pedidos.");
  for(const o of data){
   const tr=el("tr"),details=el("details"),summary=el("summary",null,"#"+o.id_pedido),items=el("ul");
   for(const item of o.pedido_productos||[])items.append(el("li",null,(item.producto?.nom_prod||"Producto #"+item.id_producto)+" × "+item.cantidad));
   details.append(summary,items);const first=el("td");first.append(details);
   const date=new Date(o.creado_en);
   tr.append(first,el("td",null,Number.isNaN(date.getTime())?"—":date.toLocaleDateString("es-MX")),el("td",null,orderState(o.estado)),el("td",null,money(Math.round(Number(o.costo)*100))));
   const action=el("td");
   if(o.estado==="pendiente"){
    const cancel=el("button","account-secondary","Cancelar pedido");cancel.type="button";cancel.addEventListener("click",async()=>{
     if(canceling||!window.confirm("¿Cancelar el pedido #"+o.id_pedido+"?"))return;
     canceling=true;cancel.disabled=true;ordersStatus.textContent="Cancelando pedido…";
     try{await request("/api/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:o.id_pedido,estado:"cancelado"})});await loadOrders();ordersStatus.textContent="Pedido cancelado.";}catch(e){ordersStatus.textContent=e.message;cancel.disabled=false;}finally{canceling=false;}
    });action.append(cancel);
   }else action.textContent="—";
   tr.append(action);ordersBody.append(tr);
  }
  ordersStatus.textContent=data.length+" pedido(s).";
 }catch(e){orderMessage(e.message);ordersStatus.textContent="No se pudo actualizar el historial.";}finally{loadingOrders=false;}
}
window.addEventListener("hashchange",()=>{if(location.hash==="#pedidos")loadOrders();});
loadProfile();
