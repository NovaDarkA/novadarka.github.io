(function(){
 const profilePage=document.querySelector(".account-page");
 const adminPage=document.querySelector(".management-layout");
 const dropdown=document.querySelector(".account-dropdown");
 const guestLinks=dropdown?[...dropdown.querySelectorAll("[data-account-guest]")]:[];
 const note=dropdown?.querySelector(".nav-note");
 const profileLink=dropdown?.querySelector('a[href="/cuenta"]');
 const favorites=dropdown?.querySelector("[data-open-favorites]");
 const cartLink=dropdown?.querySelector('a[href="/carrito"]');
 let signingOut=false;
 const signOut=async(event)=>{
  if(signingOut)return;
  signingOut=true;
  const button=event.currentTarget;
  const label=button.textContent;
  button.disabled=true;
  button.textContent="Cerrando sesión…";
  button.setAttribute("aria-busy","true");
  try{
   const response=await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
   if(!response.ok)throw Error();
   location.replace("/login");
  }catch{
   signingOut=false;
   button.disabled=false;
   button.textContent=label;
   button.removeAttribute("aria-busy");
   alert((window.shoefitT||String)("No se pudo cerrar la sesión. Intenta nuevamente."));
  }
 };
 function showGuest(){
  if(!dropdown)return;
  for(const link of guestLinks)link.hidden=false;
  if(note)note.hidden=true;
  if(profileLink)profileLink.hidden=true;
  if(favorites)favorites.hidden=true;
  if(cartLink)cartLink.hidden=true;
  dropdown.querySelectorAll("[data-session-logout]").forEach(button=>button.remove());
 }
 function showAuthenticated(profile){
  if(!dropdown)return;
  for(const link of guestLinks)link.hidden=true;
  if(note)note.hidden=false;
  if(profileLink){
   const role=profile.rolez;
   profileLink.href=role==="administrador"?"/administracion":role==="empleado"?"/panel-empleado":"/cuenta";
   profileLink.textContent=role==="administrador"?"Panel administrativo":role==="empleado"?"Panel de empleados":"Mi perfil";
   profileLink.hidden=false;
  }
  if(favorites)favorites.hidden=profile.rolez!=="cliente";
  if(cartLink)cartLink.hidden=profile.rolez!=="cliente";
  dropdown.querySelectorAll("[data-session-logout]").forEach(button=>button.remove());
  const out=document.createElement("button");
  out.type="button";
  out.dataset.sessionLogout="";
  out.textContent="Cerrar sesión";
  out.addEventListener("click",signOut);
  dropdown.append(out);
 }
 if(adminPage){
  document.querySelectorAll("[data-session-logout]").forEach(button=>button.addEventListener("click",signOut));
  return;
 }
 // Fail closed before checking the server: visitors see exactly the two public account actions.
 showGuest();
 (async()=>{
  try{
   const response=await fetch("/api/session",{cache:"no-store"});
   if(!response.ok)return;
   const data=await response.json();
   const profile=data?.profile;
   if(!profile||!["cliente","empleado","administrador"].includes(profile.rolez))return;
   showAuthenticated(profile);
   if(profilePage){
    document.querySelectorAll(".account-sidebar button,.account-security-row button").forEach(button=>{button.disabled=false;button.addEventListener("click",signOut);});
    document.querySelector('.account-sidebar a[href="/login"]')?.remove();
   }
  }catch{
   // The public login and registration actions remain visible if the session cannot be verified.
  }
 })();
})();
