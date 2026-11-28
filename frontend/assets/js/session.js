(async function(){
 const profilePage=document.querySelector(".account-page");
 const adminPage=document.querySelector(".management-layout");
 let signingOut=false;
 const signOut=async (event)=>{
  if(signingOut)return;
  signingOut=true;
  const button=event.currentTarget;
  const label=button.textContent;
  button.disabled=true;button.textContent="Cerrando sesión…";button.setAttribute("aria-busy","true");
  try{const response=await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});if(!response.ok)throw Error();location.replace("/login");}catch{signingOut=false;button.disabled=false;button.textContent=label;button.removeAttribute("aria-busy");alert((window.shoefitT||String)("No se pudo cerrar la sesión. Intenta nuevamente."));}
 };
 // The administrative HTML is already protected and verified on the server.
 // It has no account dropdown or profile to hydrate, so avoid a redundant session request.
 if(adminPage){document.querySelectorAll("[data-session-logout]").forEach(b=>b.addEventListener("click",signOut));return;}
 try{
  const response=await fetch("/api/session",{cache:"no-store"});
  if(!response.ok)return;
  const {profile}=await response.json();
  if(!profile)return;
  const dropdown=document.querySelector(".account-dropdown");
  if(dropdown){
   const note=dropdown.querySelector(".nav-note");
   const profileLink=dropdown.querySelector('a[href="/cuenta"]');
   const favorites=dropdown.querySelector("[data-open-favorites]");
   const cartLink=dropdown.querySelector('a[href="/carrito"]');
   if(note)note.hidden=false;
   if(profileLink){
    profileLink.href=profile.rolez==="administrador"?"/administracion":profile.rolez==="empleado"?"/panel-empleado":"/cuenta";
    profileLink.textContent=profile.rolez==="administrador"?"Panel administrativo":profile.rolez==="empleado"?"Panel de empleados":"Mi perfil";
    profileLink.hidden=false;
   }
   if(profile.rolez==="cliente"){
    if(favorites)favorites.hidden=false;
    if(cartLink)cartLink.hidden=false;
   }
   dropdown.querySelectorAll('a[href="/login"],a[href="/registro"]').forEach(a=>a.remove());
   const out=document.createElement("button");out.type="button";out.textContent="Cerrar sesión";out.addEventListener("click",signOut);dropdown.append(out);
  }
  if(profilePage){
   document.querySelectorAll(".account-sidebar button,.account-security-row button").forEach(b=>{b.disabled=false;b.addEventListener("click",signOut);});
   document.querySelector('.account-sidebar a[href="/login"]')?.remove();
  }
 }catch{/* No private data is displayed when the server is unavailable. */}
})();
