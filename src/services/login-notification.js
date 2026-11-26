const node=/** @type {{process:{env:Record<string,string|undefined>}}} */(/** @type {unknown} */(globalThis));
/** @param {unknown} email @param {Record<string,string|undefined>} [env] @param {typeof fetch} [transport] @returns {Promise<"sent"|"skipped"|"failed">} */
export async function notifyLogin(email,env=node.process.env,transport=fetch){
 const key=env.RESEND_API_KEY?.trim(),from=env.SHOEFIT_EMAIL_FROM?.trim();
 if(!key||!from||typeof email!=="string"||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/\.(example|invalid|test|localhost)$/i.test(email))return "skipped";
 try{
  const response=await transport("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:"Shoefit: nuevo inicio de sesión",text:"Se inició sesión correctamente en tu cuenta de Shoefit. Fecha (UTC): "+new Date().toISOString()+". Si no reconoces este acceso, cambia tu contraseña."}),redirect:"error",signal:AbortSignal.timeout(2000)});
  return response.ok?"sent":"failed";
 }catch{return "failed";}
}
