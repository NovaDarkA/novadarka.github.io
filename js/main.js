(function(){
 const button=document.querySelector(".menu-toggle");
 const nav=document.querySelector("#primary-nav");
 if(!button||!nav)return;
 function setOpen(open){
   button.setAttribute("aria-expanded",String(open));
   button.setAttribute("aria-label",open?"Cerrar menú":"Abrir menú");
   nav.classList.toggle("is-open",open);
 }
 button.addEventListener("click",()=>setOpen(button.getAttribute("aria-expanded")!=="true"));
 nav.addEventListener("click",e=>{if(e.target.closest("a"))setOpen(false)});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){setOpen(false);button.focus()}});
 window.addEventListener("resize",()=>{if(window.innerWidth>650)setOpen(false)});
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

(function(){
 // Sección 6: destinos aún sin página en el diseño; evitan saltar al inicio de la página.
 document.querySelectorAll(".site-footer a[data-placeholder]").forEach(a=>{
   a.addEventListener("click",e=>e.preventDefault());
 });
})();
