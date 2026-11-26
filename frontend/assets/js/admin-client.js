export const modules={
  "productos": {
    "title": "Productos",
    "id": "id_producto",
    "fields": [
      [
        "id_proveedor",
        "Proveedor",
        "ref",
        "proveedores"
      ],
      [
        "nom_prod",
        "Nombre del producto",
        "text",
        true
      ],
      [
        "marca",
        "Marca",
        "text"
      ],
      [
        "talla",
        "Talla",
        "size"
      ],
      [
        "precio",
        "Precio (MXN)",
        "money"
      ],
      [
        "tipo_prod",
        "Tipo de producto",
        "text"
      ],
      [
        "img",
        "Ruta de imagen",
        "text"
      ],
      [
        "slug",
        "Identificador web",
        "text",
        true
      ],
      [
        "color",
        "Color",
        "text"
      ],
      [
        "activo",
        "Publicado",
        "bool"
      ]
    ]
  },
  "clientes": {
    "title": "Clientes",
    "id": "id_cliente",
    "fields": [
      [
        "id_doe",
        "Usuario asociado",
        "ref",
        "usuarios",
        true
      ],
      [
        "calle",
        "Calle",
        "text"
      ],
      [
        "numero",
        "Número",
        "text"
      ],
      [
        "colonia",
        "Colonia",
        "text"
      ],
      [
        "cp",
        "Código postal",
        "text"
      ],
      [
        "talla",
        "Talla",
        "size"
      ]
    ]
  },
  "ventas": {
    "title": "Ventas",
    "id": "id_venta",
    "fields": [
      [
        "id_cliente",
        "Cliente",
        "ref",
        "clientes",
        true
      ],
      [
        "id_empleado",
        "Empleado",
        "ref",
        "empleados",
        true
      ],
      [
        "id_producto",
        "Producto",
        "ref",
        "productos",
        true
      ],
      [
        "cantidad_pares",
        "Cantidad de pares",
        "int",
        true
      ],
      [
        "costo_de_venta",
        "Costo de venta (MXN)",
        "money",
        true
      ]
    ]
  },
  "empleados": {
    "title": "Empleados",
    "id": "id_empleado",
    "fields": [
      [
        "id_doe",
        "Usuario asociado",
        "ref",
        "usuarios",
        true
      ],
      [
        "genero",
        "Género",
        "text"
      ],
      [
        "puesto",
        "Puesto",
        "text",
        true
      ],
      [
        "salario",
        "Salario (MXN)",
        "money",
        true
      ]
    ]
  },
  "proveedores": {
    "title": "Proveedores",
    "id": "id_proveedor",
    "fields": [
      [
        "marca",
        "Marca",
        "text",
        true
      ],
      [
        "tipo_producto",
        "Tipo de producto",
        "text"
      ]
    ]
  },
  "variantes": {
    "title": "Inventario",
    "id": "id_variante",
    "fields": [
      [
        "id_producto",
        "Producto",
        "ref",
        "productos",
        true
      ],
      [
        "talla",
        "Talla (MX)",
        "size",
        true
      ],
      [
        "existencias",
        "Existencias",
        "int",
        true
      ],
      [
        "activo",
        "Activo",
        "bool"
      ]
    ]
  },
  "pedidos": {
    "title": "Pedidos",
    "id": "id_pedido",
    "readOnly": true,
    "fields": [
      [
        "id_cliente",
        "Cliente",
        "ref",
        "clientes"
      ],
      [
        "estado",
        "Estado",
        "text"
      ],
      [
        "costo",
        "Total (MXN)",
        "money"
      ],
      [
        "creado_en",
        "Fecha",
        "text"
      ]
    ]
  },
  "usuarios": {
    "title": "Usuarios",
    "id": "id_user",
    "readOnly": true,
    "fields": [
      [
        "nombre",
        "Nombre",
        "text"
      ],
      [
        "ap",
        "Apellido paterno",
        "text"
      ],
      [
        "am",
        "Apellido materno",
        "text"
      ]
    ]
  }
};
export function fieldValue(field,raw){
 const [key,label,type,option,requiredRef]=field;
 const required=type==="ref"?requiredRef:option===true;
 if(type==="bool")return raw===true;
 const value=String(raw??"").trim();
 if(!value){if(required)throw Error("Completa "+label+".");return null;}
 if(type==="text"){if(key==="cp"&&!/^\d{5}$/.test(value))throw Error("Código postal de cinco dígitos.");if(key==="slug"&&!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value))throw Error("Identificador web inválido.");return value;}
 const n=Number(value),min=type==="money"||key==="existencias"?0:type==="size"?0.1:1;
 if(!Number.isFinite(n)||n<min||(type==="int"||type==="ref")&&!Number.isInteger(n)||type==="size"&&Math.abs(n*10-Math.round(n*10))>1e-6||type==="money"&&Math.abs(n*100-Math.round(n*100))>0.001)throw Error("Revisa "+label+".");
 return n;
}
export function mutationBody(key,values,original=null){
 const out={};for(const field of modules[key].fields){const k=field[0];if(original&&k==="id_doe")continue;const v=fieldValue(field,values[k]);if(!original||v!==(original[k]??null))out[k]=v;}
 return out;
}
