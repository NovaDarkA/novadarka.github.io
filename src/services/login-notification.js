const node=/** @type {{process:{env:Record<string,string|undefined>}}} */(/** @type {unknown} */(globalThis));
/** @param {unknown} email @param {Record<string,string|undefined>} [env] @param {typeof fetch} [transport] @returns {Promise<"sent"|"skipped"|"failed">} */
export async function notifyLogin(email,env=node.process.env,transport=fetch){
 const provider=env.SHOEFIT_EMAIL_PROVIDER?.trim()||"resend";
 if(provider!=="resend"&&provider!=="brevo")return "failed";
 const key=(provider==="brevo"?env.BREVO_API_KEY:env.RESEND_API_KEY)?.trim();
 const from=env.SHOEFIT_EMAIL_FROM?.trim();
 if(!key||!from||typeof email!=="string"||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/\.(example|invalid|test|localhost)$/i.test(email))return "skipped";
 const subject="Shoefit: nuevo inicio de sesión";
 const text="Se inició sesión correctamente en tu cuenta de Shoefit. Fecha (UTC): "+new Date().toISOString()+". Si no reconoces este acceso, cambia tu contraseña.";
 try{
  const url=provider==="brevo"?"https://api.brevo.com/v3/smtp/email":"https://api.resend.com/emails";
  /** @type {HeadersInit} */
  const headers=provider==="brevo"?{"api-key":key,"Content-Type":"application/json"}:{"Authorization":"Bearer "+key,"Content-Type":"application/json"};
  const body=provider==="brevo"?{sender:{name:"Shoefit",email:from},to:[{email}],subject,textContent:text}:{from,to:[email],subject,text};
  const response=await transport(url,{method:"POST",headers,body:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(2000)});
  if(!response.ok)console.warn("shoefit_email_provider_rejected",provider,response.status);
  return response.ok?"sent":"failed";
 }catch{return "failed";}
}
