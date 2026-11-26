export const profileFields=["nombre","ap","am","calle","numero","colonia","cp","talla"];
export function profileChanges(values,original){
 const changes={};
 for(const key of profileFields){
  const raw=String(values[key]??"").trim();
  let value=raw||null;
  if(key==="nombre"&&!value)throw Error("Escribe tu nombre.");
  if(key==="cp"&&value&&!/^\d{5}$/.test(value))throw Error("El código postal debe tener cinco dígitos.");
  if(key==="talla"&&value!==null){value=Number(value);if(!Number.isFinite(value)||value<=0||value>999.9||Math.abs(value*10-Math.round(value*10))>0.00001)throw Error("La talla debe ser positiva y tener como máximo un decimal.");}
  const max={nombre:100,ap:100,am:100,calle:150,numero:20,colonia:100,cp:5}[key];
  if(typeof value==="string"&&max&&value.length>max)throw Error("Revisa la longitud de los campos.");
  if(value!==(original[key]??null))changes[key]=value;
 }
 return changes;
}
export function orderState(state){return ({pendiente:"Pendiente",entregado:"Entregado",cancelado:"Cancelado"})[state]||"Desconocido";}
