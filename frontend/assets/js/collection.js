import {searchProducts,PRODUCTS,money,setImage,catalogAvailable} from "./products.js";
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/'/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function metadata(p){const type=slug(p.type);return {brand:p.brand?slug(p.brand):"unknown",type:/sneaker|sport|tenis/.test(type)?"sneakers":/boot|bota/.test(type)?"boots":/casual/.test(type)?"casual":type||"unknown"};}
export function filterCollection({query="",brand="",type="",price="",size="",sort="default"}={}){
 const list=searchProducts(query).filter(p=>{
   const m=metadata(p);
   const n=p.priceCents;
   return (!size||p.sizes.includes(size))&&(!brand||m.brand===brand)&&(!type||m.type===type)&&(!price||(price==="unknown"?n===null:n!==null&&(price==="low"?n<=300000:price==="mid"?n>300000&&n<=400000:price==="high"?n>400000:false)));
 });
 if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name,"es"));
 else if(sort==="asc"||sort==="desc")list.sort((a,b)=>a.priceCents===null?(b.priceCents===null?0:1):b.priceCents===null?-1:(sort==="asc"?a.priceCents-b.priceCents:b.priceCents-a.priceCents));
 return list;
}
export function paginate(items,page=1,pageSize=8){
 const pages=Math.max(1,Math.ceil(items.length/pageSize));
 const current=Math.min(pages,Math.max(1,page));
 return {pages,current,items:items.slice((current-1)*pageSize,current*pageSize)};
}
function boot(){
 const form=document.getElementById("collection-filters");
 if(!form)return;
 const grid=document.getElementById("collection-grid");
 const template=grid.querySelector(".product-card").cloneNode(true);
 grid.replaceChildren();
 const cards=new Map();
 for(const p of Object.values(PRODUCTS)){
  const card=template.cloneNode(true);card.dataset.product=p.id;setImage(card.querySelector("img"),p);
  card.querySelector(".catalog-card-meta").textContent=[p.color,p.category].join(" · ");
  card.querySelector("h2").textContent=p.name;card.querySelector(".product-price").textContent=money(p.priceCents);
  card.querySelector(".product-select").href="sorprendeme.html?producto="+encodeURIComponent(p.id);cards.set(p.id,card);grid.append(card);
 }
 for(const [key,label] of [["brand","Marca"],["type","Tipo"]]){
  const select=document.getElementById("collection-"+key);
  const values=new Map(Object.values(PRODUCTS).map(p=>[metadata(p)[key],key==="brand"?(p.brand||"Sin marca confirmada"):({sneakers:"Tenis",casual:"Zapatos casuales",boots:"Botas"})[metadata(p).type]||p.type||"Sin tipo"]));
  for(const [value,text] of values)if(![...select.options].some(o=>o.value===value))select.add(new Option(text,value));
 }
 const sizeSelect=document.getElementById("collection-size");
 const sizes=[...new Set(Object.values(PRODUCTS).flatMap(p=>p.sizes))].sort((a,b)=>Number(a)-Number(b));
 sizeSelect.replaceChildren(new Option("Todas las tallas",""),...sizes.map(s=>new Option(s+" MX",s)));
 sizeSelect.disabled=!catalogAvailable||!sizes.length;
 document.getElementById("size-note").textContent=!catalogAvailable?"Inventario no disponible.":sizes.length?"Solo tallas con existencias confirmadas.":"No hay tallas disponibles por ahora.";
 document.querySelector(".catalog-preview-note").textContent=catalogAvailable?"Precios consultados en la base de datos. Consulta cada producto para ver sus existencias.":"Catálogo temporalmente no disponible.";
 const sort=document.getElementById("collection-sort");
 const count=document.getElementById("collection-count"),empty=document.getElementById("collection-empty"),prev=document.getElementById("collection-prev"),next=document.getElementById("collection-next"),pageLabel=document.getElementById("collection-page");
 const filterDetails=document.querySelector(".catalog-filter-details");
 if(matchMedia("(max-width:760px)").matches)filterDetails.open=false;
 let page=1;
 function render(){
   const filters=Object.fromEntries(["query","brand","type","price","size"].map(key=>[key,document.getElementById("collection-"+key).value]));
   const all=filterCollection({...filters,sort:sort.value});
   const result=paginate(all,page);page=result.current;
   for(const c of cards.values())c.hidden=true;
   for(const product of result.items){const card=cards.get(product.id);if(card){card.hidden=false;grid.append(card);}}
   count.textContent=all.length+" "+(all.length===1?"modelo":"modelos");
   empty.hidden=all.length>0;
   pageLabel.textContent="Página "+page+" de "+result.pages;
   prev.disabled=page<=1;next.disabled=page>=result.pages;
 }
 form.addEventListener("submit",e=>e.preventDefault());
 form.addEventListener("input",()=>{page=1;render();});
 form.addEventListener("reset",()=>{sort.value="default";page=1;queueMicrotask(render);});
 sort.addEventListener("change",()=>{page=1;render();});
 prev.addEventListener("click",()=>{page--;render();});next.addEventListener("click",()=>{page++;render();});
 document.getElementById("collection-clear").addEventListener("click",()=>form.reset());
 render();
}
if(typeof document!=="undefined")boot();
