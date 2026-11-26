const form=document.querySelector("#recovery-form"),status=document.querySelector("#recovery-status"),email=form.elements.email,code=form.elements.code,password=form.elements.password,confirmation=form.elements.confirmation,step=document.querySelector("#recovery-step"),button=form.querySelector("button"),resend=document.querySelector("#recovery-resend");
let phase="request",busy=false;
function toggle(){button.disabled=busy;resend.disabled=busy;email.readOnly=phase==="reset";step.hidden=phase!=="reset";for(const f of [code,password,confirmation]){f.disabled=phase!=="reset";f.required=phase==="reset";}button.textContent=busy?"Procesando…":phase==="reset"?"Guardar nueva contraseña":"Enviar código de recuperación";}
async function submit(action){
 if(busy)return;
 if(!email.validity.valid){email.reportValidity();return;}
 if(action==="reset"&&password.value!==confirmation.value){status.textContent="Las contraseñas no coinciden.";return;}
 busy=true;toggle();status.textContent="";
 try{
  const body={action,email:email.value};if(action==="reset"){body.code=code.value;body.password=password.value;}
  const r=await fetch("/api/recovery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(35000)});
  const data=await r.json();
  if(!r.ok){status.textContent=r.status===429?"Demasiados intentos. Espera antes de reintentar.":data.error==="invalid_or_expired_code"?"Código inválido o vencido. Solicita otro.":data.error==="password_not_updated"?"No se pudo cambiar la contraseña. Solicita un nuevo código e intenta otra contraseña.":"El servicio de recuperación no está disponible.";return;}
  if(action==="request"&&data.status==="check_email"){phase="reset";status.textContent="Si el correo está registrado y puede recibir mensajes, recibirás un código. Revisa también el correo no deseado.";toggle();code.focus();}
  else if(action==="reset"&&data.status==="password_updated"){form.reset();phase="request";status.textContent="Contraseña actualizada. Regresa al inicio de sesión."; }
  else status.textContent="No se pudo confirmar la operación.";
 }catch{status.textContent="No se pudo conectar con el servicio. Intenta nuevamente.";}
 finally{busy=false;toggle();}
}
form.addEventListener("submit",e=>{e.preventDefault();void submit(phase);});
resend.addEventListener("click",()=>{void submit("request");});
toggle();
