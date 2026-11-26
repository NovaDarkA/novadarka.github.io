import {PRODUCTS,money,setImage,catalogAvailable} from "./products.js";
const products=Object.values(PRODUCTS);
const flash=document.querySelector("#flash-products"),best=document.querySelector(".best-grid");
function render(grid,selector,items){
 const template=grid.querySelector(selector)?.cloneNode(true);grid.replaceChildren();
 if(!template)return;
 for(const p of items){
  const card=template.cloneNode(true);setImage(card.querySelector("img"),p);
  card.querySelector("h3").textContent=p.name;card.querySelector(".product-select").href="sorprendeme.html?producto="+encodeURIComponent(p.id);
  card.querySelector(".price-old")?.remove();
  const price=card.querySelector(".price-new");if(price)price.textContent=money(p.priceCents);
  grid.append(card);
 }
 if(!items.length){const note=document.createElement("p");note.textContent=catalogAvailable?"No hay productos disponibles.":"Catálogo no disponible.";grid.append(note);}
}
render(flash,".flash-card",products.filter(p=>p.priceCents!==null));
render(best,".best-item",products);
document.querySelector(".best-stars")?.remove();
document.querySelector("#best-title").textContent="Explore our products";
const buy=document.querySelector(".best-actions .best-btn");
if(buy)buy.href="coleccion.html";
window.dispatchEvent(new Event("resize"));
