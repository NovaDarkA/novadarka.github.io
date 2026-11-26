import {searchProducts} from "./products.js";
const metadata=Object.freeze({"flexible-sneakers-gray":{brand:"unknown",type:"sneakers"},"sport-orange-white":{brand:"unknown",type:"sneakers"},"martin-dingman-brown":{brand:"martin-dingman",type:"casual"},"casual-boots-brown":{brand:"martin-oneil",type:"boots"}});
export function filterCollection({query="",brand="",type="",price="",sort="default"}={}){
 const list=searchProducts(query).filter(p=>{
   const m=metadata[p.id];
   const n=p.priceCents;
   return (!brand||m.brand===brand)&&(!type||m.type===type)&&(!price||(price==="unknown"?n===null:n!==null&&(price==="low"?n<=300000:price==="mid"?n>300000&&n<=400000:price==="high"?n>400000:false)));
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
 const cards=new Map([...grid.querySelectorAll("[data-product]")].map(c=>[c.dataset.product,c]));
 const sort=document.getElementById("collection-sort");
 const count=document.getElementById("collection-count"),empty=document.getElementById("collection-empty"),prev=document.getElementById("collection-prev"),next=document.getElementById("collection-next"),pageLabel=document.getElementById("collection-page");
 const filterDetails=document.querySelector(".catalog-filter-details");
 if(matchMedia("(max-width:760px)").matches)filterDetails.open=false;
 let page=1;
 function render(){
   const filters=Object.fromEntries(["query","brand","type","price"].map(key=>[key,document.getElementById("collection-"+key).value]));
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
