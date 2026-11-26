(function(){
 const button=document.querySelector(".menu-toggle");
 const nav=document.querySelector("#primary-nav");
 const header=document.querySelector(".site-header");
 const disclosures=[...document.querySelectorAll(".nav-disclosure")];
 if(!button||!nav)return;
 function closeMenus(except){for(const d of disclosures)if(d!==except)d.open=false;}
 function setOpen(open){
   if(!open)closeMenus();
   button.setAttribute("aria-expanded",String(open));
   button.setAttribute("aria-label",open?"Cerrar menú":"Abrir menú");
   nav.classList.toggle("is-open",open);
 }
 button.addEventListener("click",()=>setOpen(button.getAttribute("aria-expanded")!=="true"));
 nav.addEventListener("click",e=>{if(e.target.closest("a"))setOpen(false)});
 for(const d of disclosures)d.addEventListener("toggle",()=>{if(d.open){closeMenus(d);if(d.classList.contains("account-disclosure")&&nav.classList.contains("is-open")){button.setAttribute("aria-expanded","false");button.setAttribute("aria-label","Abrir menú");nav.classList.remove("is-open");}}});
 document.addEventListener("click",e=>{if(header&&!header.contains(e.target))setOpen(false)});
 document.addEventListener("keydown",e=>{if(e.key!=="Escape"||document.querySelector("dialog[open]"))return;const active=disclosures.find(d=>d.open);if(active){active.open=false;active.querySelector("summary").focus();e.preventDefault();}else if(button.getAttribute("aria-expanded")==="true"){setOpen(false);button.focus();}});
 const desktop=matchMedia("(min-width:651px)");desktop.addEventListener("change",()=>setOpen(false));
})();

(function(){
 const track=document.querySelector("#flash-products");
 if(!track)return;
 const buttons=document.querySelectorAll("[data-scroll]");
 const prev=document.querySelector(".carousel-prev");
 const next=document.querySelector(".carousel-next");
 function step(){
   const card=track.querySelector(".flash-card");
   const gap=parseFloat(getComputedStyle(track).columnGap)||0;
   return card?card.getBoundingClientRect().width+gap:180;
 }
 function update(){
   const max=track.scrollWidth-track.clientWidth;
   track.parentElement.classList.toggle("is-static",max<=1);
   if(prev)prev.disabled=max<=1||track.scrollLeft<=1;
   if(next)next.disabled=max<=1||track.scrollLeft>=max-1;
 }
 buttons.forEach(button=>{
   button.addEventListener("click",()=>{
     track.scrollBy({left:step()*Number(button.dataset.scroll),behavior:"smooth"});
   });
 });
 track.addEventListener("scroll",update,{passive:true});
 window.addEventListener("resize",update);
 update();
})();

