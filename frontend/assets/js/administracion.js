import {localizeCatalogRecord,catalogLabel} from "./catalog-labels.js";
import {modules,mutationBody} from "./admin-client.js";
 const links=[...document.querySelectorAll("[data-module]")],panels=[...document.querySelectorAll("[data-module-panel]")];
 const dialog=document.getElementById("admin-dialog"),content=document.getElementById("admin-dialog-content"),commit=document.getElementById("admin-commit"),message=document.getElementById("admin-dialog-message"),heading=document.querySelector(".management-status strong"),notice=document.querySelector(".management-status p");
 const errorBanner=document.querySelector(".management-status");
 const clearError=()=>{errorBanner.hidden=true;notice.textContent="";};
 const showError=(title,detail)=>{heading.textContent=title;notice.textContent=detail;errorBanner.hidden=false;};
 const employeeMode=document.documentElement.dataset.panelRole==="empleado";
 const isReadOnly=key=>key==="clientes"||modules[key].readOnly===true||(employeeMode&&key==="empleados");
 const visibleFields=key=>employeeMode&&key==="empleados"?modules[key].fields.filter(([field])=>field!=="salario"):modules[key].fields;
 const moduleTitle=key=>employeeMode&&key==="empleados"?"Mi ficha":modules[key].title;
 if(employeeMode){
  const employeeLink=document.querySelector('[data-module="empleados"] span');
  if(employeeLink)employeeLink.textContent="Mi ficha";
  const employeePanel=document.getElementById("empleados");
  employeePanel.querySelector("h2").textContent="Mi ficha";
  employeePanel.querySelector(".admin-panel-heading p").textContent="Consulta tu propia información de empleado.";
  for(const th of employeePanel.querySelectorAll("thead th"))if(["Correo electrónico","Salario (MXN)"].includes(th.textContent.trim()))th.remove();
 }
 const readOnlyNote=document.getElementById("employee-readonly-note");
 const actionGroup=document.querySelector(".management-actions");
 const buttons=[...document.querySelectorAll("[data-admin-action]")],orderActions=document.getElementById("admin-order-actions");
 const layout=document.querySelector(".management-layout"),sidebar=document.getElementById("admin-sidebar"),sidebarToggle=document.getElementById("admin-sidebar-toggle"),toggleLabel=document.getElementById("admin-sidebar-toggle-label");
 sidebarToggle.addEventListener("click",()=>{
   const collapsed=!sidebar.hidden;
   sidebar.hidden=collapsed;
   layout.classList.toggle("admin-sidebar-collapsed",collapsed);
   sidebarToggle.setAttribute("aria-expanded",String(!collapsed));
   const label=collapsed?"Mostrar barra lateral":"Ocultar barra lateral";
   sidebarToggle.setAttribute("aria-label",label);
   sidebarToggle.title=label;
   toggleLabel.textContent=collapsed?"Mostrar menú":"Ocultar menú";
 });

 let selected="productos",page=1,records=[],hasMore=false,chosen=null,ready=false,version=0,opener,operation=null,busy=false;
 const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;};
 const path=(key,id=null,p=1)=>"/api/admin?"+new URLSearchParams({module:key,page:String(p),...(id===null?{}:{id:String(id)})});
 async function request(url,options={}){
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(15000),...options});
  if(!r.ok){let code="";try{code=(await r.json()).error||"";}catch{}throw Error(r.status===401?"Inicia sesión nuevamente.":r.status===403?"Acceso administrativo requerido.":r.status===409?"El registro está relacionado con otros datos o ya existe.":code.startsWith("invalid_field_")?"Revisa el campo "+code.slice(14)+".":r.status===400?"Revisa los datos del registro.":"No se pudo completar la operación.");}
  return r.json();
 }
 function controls(){
  const restricted=employeeMode&&selected==="empleados";actionGroup.hidden=selected==="clientes"||selected==="pedidos"||restricted;document.documentElement.dataset.activeAdminModule=selected;if(readOnlyNote)readOnlyNote.hidden=!restricted;for(const b of buttons){b.hidden=actionGroup.hidden;b.disabled=!ready||busy||isReadOnly(selected)||(b.dataset.adminAction!=="add"&&!records.length);}
  orderActions.hidden=selected!=="pedidos";for(const b of orderActions.querySelectorAll("button"))b.disabled=!ready||busy||chosen?.estado!=="pendiente";
 }
 const displayValue=(row,key)=>key==="id_producto"?(catalogLabel(row.producto?.nom_prod)||"Producto no disponible"):row[key];
 function render(){
  const panel=document.getElementById(selected),m=modules[selected],body=panel.querySelector("tbody"),query=panel.querySelector('input[type="search"]').value.toLowerCase(),sort=panel.querySelector(".admin-filters select").value;
  const filtered=records.filter(r=>[...Object.values(r),...Object.values(r.usuario||{}),r.producto?.nom_prod, catalogLabel(r.producto?.nom_prod)].some(v=>String(v??"").toLowerCase().includes(query)));
  if(sort)filtered.sort((a,b)=>typeof displayValue(a,sort)==="number"&&typeof displayValue(b,sort)==="number"?displayValue(a,sort)-displayValue(b,sort):String(displayValue(a,sort)??"").localeCompare(String(displayValue(b,sort)??""),"es",{numeric:true}));
  body.replaceChildren();
  if(!filtered.length){const tr=node("tr"),td=node("td","admin-empty",ready?"Sin registros disponibles.":"Consultando registros…");td.colSpan=visibleFields(selected).length+2+(selected==="empleados"?(employeeMode?1:2):0);tr.append(td);body.append(tr);}
  for(const row of filtered){
   const tr=node("tr"),td=node("td"),radio=node("input");radio.type="radio";radio.name="selected-"+selected;radio.checked=chosen?.[m.id]===row[m.id];radio.setAttribute("aria-label","Seleccionar registro "+row[m.id]);radio.addEventListener("change",()=>{chosen=row;controls();});td.append(radio);tr.append(td,node("td",null,String(row[m.id])));
   for(const [key,,type] of visibleFields(selected)){
    const val=displayValue(row,key);tr.append(node("td",null,val==null?"—":type==="bool"?val?"Sí":"No":String(val)));
    if(selected==="empleados"&&key==="id_doe"){
     const u=row.usuario;tr.append(node("td",null,u?[u.nombre,u.ap,u.am].filter(Boolean).join(" ")||"—":"—"));
     if(!employeeMode)tr.append(node("td",null,u?.mail||"—"));
    }
   }
   body.append(tr);
  }
  panel.querySelector(".admin-count").textContent=ready?filtered.length+" registro(s) en esta página":"Sin conexión";
  const [prev,next]=panel.querySelectorAll(".admin-pagination button");prev.disabled=!ready||page<=1;next.disabled=!ready||!hasMore;panel.querySelector(".admin-pagination span").textContent="Página "+page;
  controls();
 }
 async function load(){
  const seq=++version,key=selected;ready=false;chosen=null;records=[];render();clearError();
  try{const r=await request(path(key,null,page));if(seq!==version)return;if(!Array.isArray(r.data))throw Error("Respuesta inválida.");records=r.data.map(localizeCatalogRecord);hasMore=r.hasMore===true;ready=true;clearError();}
  catch(e){if(seq!==version)return;showError("Sin acceso a los datos",e.message);}
  if(seq===version){const panel=document.getElementById(key);for(const e of panel.querySelectorAll(".admin-filters input,.admin-filters select,.admin-filters button"))e.disabled=!ready;render();}
 }
 function activate(){const requested=location.hash.slice(1);selected=panels.some(panel=>panel.id===requested)&&Object.hasOwn(modules,requested)?requested:"productos";if(requested==="usuarios")history.replaceState(history.state,"",location.pathname+location.search+"#productos");controls();if(dialog.open&&!busy)dialog.close();page=1;document.getElementById("admin-current-module").textContent=moduleTitle(selected);document.getElementById("admin-workspace-title").textContent=moduleTitle(selected);for(const panel of panels)panel.hidden=panel.id!==selected;for(const link of links){if(link.dataset.module===selected)link.setAttribute("aria-current","true");else link.removeAttribute("aria-current");}load();}
 for(const panel of panels){
  const m=modules[panel.id],sort=panel.querySelector(".admin-filters select");sort.replaceChildren(new Option("Identificador",m.id),...visibleFields(panel.id).map(f=>new Option(f[1],f[0])));
  panel.querySelector('input[type="search"]').addEventListener("input",render);sort.addEventListener("change",render);panel.querySelector(".admin-filters button").addEventListener("click",()=>{panel.querySelector('input[type="search"]').value="";sort.value=m.id;render();});
  const [prev,next]=panel.querySelectorAll(".admin-pagination button");prev.addEventListener("click",()=>{if(ready&&page>1){page--;load();}});next.addEventListener("click",()=>{if(ready&&hasMore){page++;load();}});
 }
 async function refs(key){
  const result=[];for(let i=1;i<=100;i++){const r=await request(path(key,null,i));result.push(...r.data.map(localizeCatalogRecord));if(!r.hasMore)return result;}throw Error("Demasiados registros relacionados.");
 }
 function labelRow(key,r){return "#"+r[modules[key].id]+" · "+(r.nom_prod||catalogLabel(r.producto?.nom_prod)||r.nombre||r.usuario?.nombre||r.marca||r.puesto||r.calle||"Registro")+(r.mail||r.usuario?.mail?" · "+(r.mail||r.usuario.mail):"");}
 async function openOperation(action,button){
  if(!ready||busy||isReadOnly(selected))return;const key=selected,m=modules[key];opener=button;operation={key,action,row:chosen||records[0]||null,inputs:{}};
  const op=operation;content.replaceChildren();message.textContent="Preparando operación…";commit.disabled=true;
  document.getElementById("admin-dialog-title").textContent=({add:"Agregar",edit:"Modificar",delete:"Eliminar"})[action]+" — "+m.title;
  commit.textContent=action==="delete"?"Confirmar eliminación":"Guardar cambios";commit.classList.toggle("admin-danger",action==="delete");dialog.showModal();
  if(action!=="add"){
   const pick=node("select");for(const r of records)pick.add(new Option(labelRow(key,r),String(r[m.id])));pick.value=String(op.row?.[m.id]);const wrap=node("label","admin-field","Registro seleccionado");wrap.append(pick);content.append(wrap);
   pick.addEventListener("change",()=>{op.row=records.find(r=>String(r[m.id])===pick.value);fill();});
  }
  function fill(){for(const [k,input] of Object.entries(op.inputs)){const value=op.row?.[k];if(input.type==="checkbox")input.checked=value??(key==="variantes"&&action==="add");else input.value=value??(k==="existencias"&&action==="add"?"0":"");}}
  if(action==="delete"){content.append(node("p","admin-delete-note","¿Deseas eliminar el registro seleccionado? La base de datos rechazará registros que tengan relaciones protegidas."));message.textContent="Esta acción elimina únicamente el registro seleccionado.";commit.disabled=!op.row;return;}
  const fields=node("div","admin-fields");content.append(fields);
  try{
   const related=Object.fromEntries(await Promise.all([...new Set(m.fields.filter(f=>f[2]==="ref").map(f=>f[3]))].map(async k=>[k,await refs(k)])));
   if(operation!==op||!dialog.open)return;
   for(const f of m.fields){const [k,label,type,ref,requiredRef]=f;const wrap=node("label","admin-field"),input=node(type==="ref"||k==="publico"?"select":"input");wrap.append(node("span","admin-field-label",label));input.dataset.column=k;
    if(k==="publico"){for(const [label,value] of [["Sin asignar",""],["Hombres","hombre"],["Mujeres","mujer"],["Unisex","unisex"]])input.add(new Option(label,value));}
    else if(type==="ref"){input.add(new Option(requiredRef?"Selecciona un registro":"Sin asignar",""));for(const r of related[ref])input.add(new Option(ref==="productos"?r.nom_prod:labelRow(ref,r),String(r[modules[ref].id])));}
    else{input.type=type==="bool"?"checkbox":type==="text"?"text":"number";if(input.type==="number")input.step=type==="size"?"0.1":type==="money"?"0.01":"1";}
    if(k==="id_doe"&&action==="edit")input.disabled=true;
    op.inputs[k]=input;wrap.append(input);fields.append(wrap);
   }
   if(action==="add")op.row=null;fill();message.textContent="Los cambios se guardarán en Supabase.";commit.disabled=false;
  }catch(e){if(operation===op)message.textContent=e.message;}
 }
 for(const b of buttons)b.addEventListener("click",()=>openOperation(b.dataset.adminAction,b));
 commit.addEventListener("click",async()=>{
  const op=operation;if(!op||busy||commit.disabled||isReadOnly(op.key))return;const m=modules[op.key];busy=true;commit.disabled=true;controls();
  try{
   const method={add:"POST",edit:"PATCH",delete:"DELETE"}[op.action];
   const values=Object.fromEntries(Object.entries(op.inputs).map(([k,i])=>[k,i.type==="checkbox"?i.checked:i.value]));
   const body=method==="DELETE"?undefined:mutationBody(op.key,values,method==="PATCH"?op.row:null);
   if(body&&!Object.keys(body).length){message.textContent="No hay cambios pendientes.";return;}
   await request(path(op.key,method==="POST"?null:op.row[m.id]),{method,headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
   dialog.close();if(selected===op.key){await load();}
  }catch(e){message.textContent=e.message;}finally{busy=false;commit.disabled=false;controls();}
 });
 for(const b of orderActions.querySelectorAll("button"))b.addEventListener("click",async()=>{if(!chosen||busy||chosen.estado!=="pendiente"||!window.confirm((window.shoefitT||String)("¿Cambiar el estado del pedido #"+chosen.id_pedido+"?")))return;busy=true;controls();try{await request("/api/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:chosen.id_pedido,estado:b.dataset.orderState})});await load();}catch(e){showError("No se pudo completar la operación.",e.message);}finally{busy=false;controls();}});
 document.querySelector(".admin-close").addEventListener("click",()=>{if(!busy)dialog.close();});document.getElementById("admin-cancel").addEventListener("click",()=>{if(!busy)dialog.close();});dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});dialog.addEventListener("close",()=>{operation=null;opener?.focus();});window.addEventListener("hashchange",activate);activate();
