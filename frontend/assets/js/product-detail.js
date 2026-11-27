import {PRODUCT,PRODUCTS,DEFAULT_PRODUCT_ID,getProduct,setImage} from "./products.js";
const details={
 "flexible-sneakers-gray":["Tenis","Tenis grises con agujetas y suela blanca. Consulta las cuatro fotografías del modelo."],
 "sport-orange-white":["Tenis deportivos","Calzado deportivo blanco con detalles naranjas, según la imagen del catálogo."],
 "martin-dingman-brown":["Zapatos casuales","Zapatos casuales de color café con suela blanca, según la imagen del catálogo."],
 "casual-boots-brown":["Botas","Botas casuales de color café, según la imagen del catálogo."]
};
const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100)+" MXN";
const id=new URLSearchParams(location.search).get("producto");
const product=id===null?PRODUCT:getProduct(id);
const image=document.getElementById("detail-image"),thumbs=document.getElementById("detail-thumbnails"),note=document.getElementById("detail-gallery-note");
const qty=document.getElementById("detail-quantity"),minus=document.getElementById("detail-minus"),plus=document.getElementById("detail-plus");
const canDraft=!!product&&product.priceCents!==null;
if(product){
 const [type,description]=details[product.id]||[product.category,product.name];
 document.getElementById("detail-type").textContent=type;
 document.getElementById("detail-description").textContent=description;
 if(product.id!==DEFAULT_PRODUCT_ID||product.image!=="img/optimized/tenis-gris-lateral-619.webp"){thumbs.hidden=true;note.textContent="Una fotografía disponible para este modelo.";}
}else{
 thumbs.hidden=true;image.hidden=true;note.textContent="Producto no disponible.";
 document.getElementById("detail-type").textContent="—";document.getElementById("detail-description").textContent="Selecciona un producto del catálogo.";
}
for(const b of thumbs.querySelectorAll("button")){
 b.addEventListener("click",()=>{if(product?.id!==DEFAULT_PRODUCT_ID||thumbs.hidden)return;image.src=b.dataset.image;image.alt=b.getAttribute("aria-label")+" de los tenis grises";for(const other of thumbs.querySelectorAll("button"))other.setAttribute("aria-pressed",String(other===b));});
}
function refresh(){
 const n=Number(qty.value),valid=Number.isInteger(n)&&n>=1&&n<=99;
 minus.disabled=!canDraft||!valid||n<=1;plus.disabled=!canDraft||!valid||n>=99;

}
qty.disabled=!canDraft;
minus.addEventListener("click",()=>{qty.value=String(Math.max(1,Number(qty.value)-1));refresh();});
plus.addEventListener("click",()=>{qty.value=String(Math.min(99,Number(qty.value)+1));refresh();});
qty.addEventListener("input",refresh);qty.addEventListener("blur",()=>{if(!qty.checkValidity()||!qty.value)qty.value="1";refresh();});refresh();
const grid=document.getElementById("detail-related-grid");
for(const p of Object.values(PRODUCTS).filter(p=>p.id!==product?.id&&(!product?.audience||p.audience===product.audience||p.audience==="unisex"||product.audience==="unisex")).slice(0,3)){
 const card=document.createElement("article");card.className="detail-related-card";
 const img=document.createElement("img");setImage(img,p);img.loading="lazy";
 const name=document.createElement("h3");name.textContent=p.name;
 const price=document.createElement("p");price.textContent=p.priceCents===null?"Precio por confirmar":money(p.priceCents);
 const link=document.createElement("a");link.className="product-select";link.href="/sorprendeme?producto="+encodeURIComponent(p.id);link.textContent="Ver producto";
 card.append(img,name,price,link);grid.append(card);
}
