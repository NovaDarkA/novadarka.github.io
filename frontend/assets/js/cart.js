// Temporary client-side draft. Server-side validation and persistence will replace it.
export const CART_KEY="shoefit.cart.v1";
import {PRODUCT,DEFAULT_PRODUCT_ID,getProduct,setImage,catalogAvailable} from "./products.js";
export {PRODUCT};
const validSize=s=>typeof s==="string"&&/^[1-9][0-9]{0,2}(?:\.[0-9])?$/.test(s);
export function normalize(value){
  if(!Array.isArray(value))return [];
  const map=new Map();
  for(const item of value){
    const product=getProduct(item?.id);
    if(!product||product.priceCents===null||!validSize(item.size)||!Number.isInteger(item.quantity)||item.quantity<1)continue;
    const key=product.id+":"+item.size;
    map.set(key,{id:product.id,size:item.size,quantity:Math.min(99,(map.get(key)?.quantity||0)+item.quantity)});
  }
  return [...map.values()];
}
export function changeCart(items,size,delta,id=DEFAULT_PRODUCT_ID){
  const current=normalize(items);
  const product=getProduct(id);
  if(!product||product.priceCents===null||!validSize(size)||!Number.isInteger(delta))return current;
  const item=current.find(i=>i.id===id&&i.size===size);
  const quantity=Math.max(0,Math.min(99,(item?.quantity||0)+delta));
  if(item){item.quantity=quantity;return current.filter(i=>i.quantity>0);}
  return quantity?[...current,{id,size,quantity}]:current;
}
export function totals(items){
  const rows=normalize(items);
  return {count:rows.reduce((sum,i)=>sum+i.quantity,0),cents:rows.reduce((sum,i)=>sum+i.quantity*getProduct(i.id).priceCents,0)};
}
const money=cents=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(cents/100)+" MXN";
function boot(){
  const read=()=>{try{return normalize(JSON.parse(localStorage.getItem(CART_KEY)||"[]"));}catch{return [];}};
  let items=read();
  const save=next=>{try{localStorage.setItem(CART_KEY,JSON.stringify(next));items=next;return true;}catch{return false;}};
  const status=document.getElementById("cart-status");
  const productStatus=document.getElementById("cart-product-status");
  const cartLink=document.querySelector('a[aria-label="Carrito"]');
  let badge;
  if(cartLink){badge=document.createElement("span");badge.className="cart-badge";badge.setAttribute("aria-hidden","true");cartLink.append(badge);}
  const refreshBadge=()=>{if(badge){const count=totals(items).count;badge.textContent=String(count);badge.hidden=count===0;}};
  const list=document.getElementById("cart-items");
  document.getElementById("cart-checkout")?.addEventListener("click",e=>{if(totals(items).count===0)e.preventDefault();});
  function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function render(){
    refreshBadge();
    if(!list)return;
    const {count,cents}=totals(items);
    document.getElementById("cart-count").textContent=count+" "+(count===1?"artículo":"artículos");
    document.getElementById("cart-subtotal").textContent=money(cents);
    document.getElementById("cart-total").textContent=money(cents);
    document.getElementById("cart-empty").hidden=count>0;
    const checkout=document.getElementById("cart-checkout");
    if(checkout){checkout.setAttribute("aria-disabled",String(count===0));checkout.tabIndex=count===0?-1:0;}
    list.replaceChildren();
    for(const item of items){
      const product=getProduct(item.id);
      const card=el("article","cart-item");
      const image=el("img");setImage(image,product);
      const info=el("div");info.append(el("h2",null,product.name),el("p",null,"Color: "+product.color+" · Talla: "+item.size+" MX"),el("p",null,"Precio unitario: "+money(product.priceCents)));
      const actions=el("div","cart-item-actions");
      const controls=el("div","cart-quantity");
      const update=(delta,action)=>{if(!save(changeCart(items,item.size,delta,item.id))){status.textContent="No fue posible guardar el carrito en este navegador.";return;}render();status.textContent="Carrito actualizado.";const target=list.querySelector('[data-product="'+item.id+'"][data-size="'+item.size+'"][data-action="'+action+'"]');if(target&&!target.disabled)target.focus();else list.querySelector("button:not(:disabled)")?.focus();};
      const minus=el("button",null,"−");minus.type="button";minus.dataset.size=item.size;minus.dataset.product=item.id;minus.dataset.action="minus";minus.setAttribute("aria-label","Disminuir cantidad talla "+item.size);minus.disabled=item.quantity<=1;minus.addEventListener("click",()=>update(-1,"minus"));
      const qty=el("output",null,String(item.quantity));
      const plus=el("button",null,"+");plus.type="button";plus.dataset.size=item.size;plus.dataset.product=item.id;plus.dataset.action="plus";plus.setAttribute("aria-label","Aumentar cantidad talla "+item.size);plus.disabled=item.quantity>=99;plus.addEventListener("click",()=>update(1,"plus"));
      controls.append(minus,qty,plus);
      const remove=el("button","cart-remove","Eliminar");remove.type="button";remove.setAttribute("aria-label","Eliminar talla "+item.size);remove.addEventListener("click",()=>update(-item.quantity,"remove"));
      actions.append(controls,el("p","cart-item-subtotal","Subtotal: "+money(item.quantity*product.priceCents)),remove);
      card.append(image,info,actions);list.append(card);
    }
  }
  const add=document.getElementById("add-to-cart");
  let selected=PRODUCT;
  let variants=new Map();
  if(add){
    const requested=new URLSearchParams(location.search).get("producto");
    selected=requested===null?PRODUCT:getProduct(requested);
    const title=document.getElementById("special-title"),size=document.getElementById("cart-size"),image=document.getElementById("detail-image");
    add.disabled=true;size.disabled=true;size.replaceChildren(new Option("Elige una talla",""));
    if(!selected){
      title.textContent="Producto no disponible";image.hidden=true;
      document.getElementById("detail-thumbnails").hidden=true;
      for(const selector of [".special-crumb",".special-color",".special-price"])document.querySelector(selector).textContent="";
      document.querySelector(".special-stars").hidden=true;
      for(const button of document.querySelectorAll(".special-icon"))button.hidden=true;
      productStatus.textContent="Regresa a la colección para seleccionar un producto.";
    }else{
      title.textContent=selected.name;document.title="Shoefit | "+selected.name;
      document.querySelector(".special-crumb").textContent=selected.category;
      document.querySelector(".special-color").textContent="Color: "+selected.color;
      document.querySelector(".special-price").textContent=selected.priceCents===null?"Precio por confirmar":money(selected.priceCents);
      setImage(image,selected);
      if(selected.id!==DEFAULT_PRODUCT_ID||selected.image!=="img/optimized/tenis-gris-lateral-619.webp")document.getElementById("detail-thumbnails").hidden=true;
      productStatus.textContent="Consultando existencias…";
      (async()=>{
       try{
        const response=await fetch("/api/availability?slug="+encodeURIComponent(selected.id),{cache:"no-store",signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw Error();
        const {data}=await response.json();if(data.slug!==selected.id||!Array.isArray(data.variantes))throw Error();
        for(const v of data.variantes){
         if(!Number.isInteger(v.id_variante)||!Number.isInteger(v.existencias)||v.existencias<0||!validSize(String(v.talla)))continue;
         const option=new Option(v.talla+" MX"+(v.disponible?"":" — Agotado"),String(v.talla));option.disabled=!v.disponible;size.add(option);
         if(v.disponible)variants.set(String(v.talla),v);
        }
        size.disabled=variants.size===0;add.disabled=variants.size===0||selected.priceCents===null;
        document.getElementById("detail-availability").textContent=variants.size?"Disponible":data.variantes.length?"Agotado":"Por confirmar";
        productStatus.textContent=variants.size?"Selecciona una talla disponible.":"No hay existencias confirmadas para este modelo.";
       }catch{productStatus.textContent="No se pudo confirmar el inventario. Intenta nuevamente.";}
      })();
    }
  }
  add?.addEventListener("click",()=>{
    if(!selected||selected.priceCents===null||add.disabled)return;
    const size=document.getElementById("cart-size");
    if(!validSize(size.value)){productStatus.textContent="Selecciona una talla antes de añadir el producto.";size.focus();return;}
    const quantity=Number(document.getElementById("detail-quantity").value);
    if(!Number.isInteger(quantity)||quantity<1||quantity>99){productStatus.textContent="Elige una cantidad entre 1 y 99.";document.getElementById("detail-quantity").focus();return;}
    const variant=variants.get(size.value);const requested=(items.find(i=>i.id===selected.id&&i.size===size.value)?.quantity||0)+quantity;
    if(!variant||requested>Math.min(99,variant.existencias)){productStatus.textContent="La cantidad supera las existencias disponibles.";return;}
    if(!save(changeCart(items,size.value,quantity,selected.id))){productStatus.textContent="No fue posible guardar el carrito en este navegador.";return;}
    location.href="/carrito";
  });
  window.addEventListener("storage",e=>{if(e.key===CART_KEY||e.key===null){items=read();render();}});
  window.addEventListener("pageshow",()=>{items=read();render();});
  render();
}
if(typeof document!=="undefined")boot();
