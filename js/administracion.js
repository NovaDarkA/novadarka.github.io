(() => {
 const modules={
  "productos": {
    "title": "Productos",
    "id": "ID_PRODUCTO",
    "fields": [
      [
        "ID_PROVEEDOR",
        "Proveedor",
        "select"
      ],
      [
        "NOM_PROD",
        "Nombre del producto",
        "text"
      ],
      [
        "MARCA",
        "Marca",
        "text"
      ],
      [
        "TALLA",
        "Talla",
        "number"
      ],
      [
        "PRECIO",
        "Precio (MXN)",
        "number"
      ],
      [
        "TIPO_PROD",
        "Tipo de producto",
        "text"
      ],
      [
        "img",
        "Ruta de imagen",
        "text"
      ]
    ]
  },
  "clientes": {
    "title": "Clientes",
    "id": "ID_CLIENTE",
    "fields": [
      [
        "id_doe",
        "Usuario asociado",
        "select"
      ],
      [
        "CALLE",
        "Calle",
        "text"
      ],
      [
        "NUMERO",
        "Número",
        "text"
      ],
      [
        "COLONIA",
        "Colonia",
        "text"
      ],
      [
        "CP",
        "Código postal",
        "text"
      ],
      [
        "TALLA",
        "Talla",
        "number"
      ]
    ]
  },
  "ventas": {
    "title": "Ventas",
    "id": "ID_VENTA",
    "fields": [
      [
        "ID_CLIENTE",
        "Cliente",
        "select"
      ],
      [
        "ID_EMPLEADO",
        "Empleado",
        "select"
      ],
      [
        "ID_PRODUCTO",
        "Producto",
        "select"
      ],
      [
        "CANTIDAD_PARES",
        "Cantidad de pares",
        "number"
      ],
      [
        "COSTO_DE_VENTA",
        "Costo de venta (MXN)",
        "number"
      ]
    ]
  },
  "empleados": {
    "title": "Empleados",
    "id": "ID_EMPLEADO",
    "fields": [
      [
        "id_doe",
        "Usuario asociado",
        "select"
      ],
      [
        "GENERO",
        "Género",
        "text"
      ],
      [
        "PUESTO",
        "Puesto",
        "text"
      ],
      [
        "SALARIO",
        "Salario (MXN)",
        "number"
      ]
    ]
  }
};
 const links=[...document.querySelectorAll("[data-module]")],panels=[...document.querySelectorAll("[data-module-panel]")];
 const dialog=document.getElementById("admin-dialog"),content=document.getElementById("admin-dialog-content"),commit=document.getElementById("admin-commit");
 let selected="productos",opener;
 function activate(){
   const requested=location.hash.slice(1);selected=Object.hasOwn(modules,requested)?requested:"productos";
   if(dialog.open)dialog.close();
   document.getElementById("admin-current-module").textContent=modules[selected].title;
   document.getElementById("admin-workspace-title").textContent=modules[selected].title;
   for(const card of document.querySelectorAll("[data-admin-shortcut]")){if(card.dataset.adminShortcut===selected)card.setAttribute("aria-current","true");else card.removeAttribute("aria-current");}
   for(const panel of panels)panel.hidden=panel.id!==selected;
   for(const link of links){if(link.dataset.module===selected)link.setAttribute("aria-current","true");else link.removeAttribute("aria-current");}
 }
 function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
 function field(key,label,type){
   const wrapper=node("label","admin-field"),input=node(type==="select"?"select":"input");
   wrapper.append(node("span","admin-field-label",label));
   input.dataset.column=key;input.disabled=true;
   if(type==="select"){input.append(node("option",null,"Sin registros disponibles"));}
   else{input.type=type;input.placeholder=label;if(type==="number")input.step="any";}
   wrapper.append(input);return wrapper;
 }
 for(const button of document.querySelectorAll("[data-admin-action]"))button.addEventListener("click",()=>{
   const action=button.dataset.adminAction,m=modules[selected];opener=button;content.replaceChildren();
   document.getElementById("admin-dialog-title").textContent=({add:"Agregar",edit:"Modificar",delete:"Eliminar"})[action]+" — "+m.title;
   commit.textContent=action==="delete"?"Confirmar eliminación":"Guardar cambios";commit.disabled=true;
   commit.classList.toggle("admin-danger",action==="delete");
   if(action!=="add")content.append(field(m.id,"Registro seleccionado","select"));
   if(action==="delete"){
     content.append(node("p","admin-delete-note","¿Deseas eliminar el registro seleccionado? Esta acción requerirá confirmación y permisos cuando el sistema esté conectado."));
     content.append(node("p","admin-dialog-note","No hay ningún registro seleccionado. No se realizará ninguna eliminación."));
   }else{
     content.append(node("h3","admin-form-heading","Información del registro"));
     const fields=node("div","admin-fields");for(const f of m.fields)fields.append(field(...f));content.append(fields);
   }
   dialog.showModal();
 });
 document.querySelector(".admin-close").addEventListener("click",()=>dialog.close());
 document.getElementById("admin-cancel").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("close",()=>opener?.focus());
 window.addEventListener("hashchange",activate);activate();
})();
