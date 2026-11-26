# F3 — Base de datos Shoefit

Estado: borrador de esquema preparado, **no aplicado**. Fecha local: 25/11/2026.

## Fuente y correspondencia
El SQL original del equipo contiene ocho entidades; su contenido se revisó directamente. Se preserva el modelo y se adapta a PostgreSQL/Supabase.

| Original | PostgreSQL | Adaptación |
|---|---|---|
| user | usuario | ID entero y auth_id UUID único asociado a auth.users; correo y rol; contraseña gestionada por Auth |
| EMPLEADO | empleado | FK a usuario, género, puesto, salario numérico |
| PROVEEDOR | proveedor | Marca y tipo |
| CLIENTE | cliente | FK a usuario, domicilio, CP textual, talla decimal |
| PRODUCTO | producto | FK de proveedor, nombre, marca, talla, precio, tipo, imagen; slug y activo |
| PEDIDO | pedido | FK de cliente, estados pendiente/entregado/cancelado, total |
| PEDIDO_Productos | pedido_productos | FK compuesta de pedido/cliente, producto, cantidad, precio unitario y subtotal generado |
| VENTA | venta | FK de empleado, cliente y producto, cantidad e importe |

## Decisiones y restricciones
- IDs identity en lugar de autoincrement, importes numeric(12,2), claves compatibles y longitudes adecuadas.
- No se ejecutan los DROP del archivo original ni se publica su encabezado con datos académicos.
- El precio y talla desconocidos quedan nulos; proveedor puede quedar sin confirmar. No se inventan inventario ni proveedores. El slug mantiene la referencia al catálogo frontend; activo es falso por defecto.
- La FK compuesta evita asociar un detalle a un cliente distinto del pedido.
- Supabase Auth gestiona credenciales. No se copian contraseñas ni se permiten cambios de rol del cliente.
- RLS en las ocho tablas y privilegios explícitos mínimos: catálogo activo público, lectura de información propia autenticada; escritura privada bloqueada hasta diseñar y verificar autorizaciones.
- Las lecturas de pedidos/detalles dependen de las políticas de cliente/usuario; se probarán con usuarios de prueba reales antes del cierre.
- Este borrador no resuelve aún variantes/inventario, alta segura de perfiles, autorización administrativa, consistencia concurrente del total de pedido, trigger, procedimiento, seed ni pruebas funcionales. No ejecutar pedidos antes de esos pasos.

## Archivos
- database/drafts/01_schema.sql: borrador inicial, no es una migración registrada ni se aplica automáticamente.
- database/checks/01_schema_checks.sql: consultas de verificación de tablas, RLS, permisos y restricciones.
- No usar la BD ATLAS: es otro proyecto y no se modificó. Crear Shoefit como proyecto independiente dentro de una organización autorizada y sin costo no aprobado. Solo después de comprobar proyecto y estado se aplicará una migración versionada, se verificarán tablas/políticas y se ejecutarán pruebas.

## Próximos pasos F3
1. Confirmar organización y proyecto independiente.
2. Aplicar esquema y verificar con consultas de catálogo.
3. Definir variantes/stock y roles; completar políticas, seed, JOIN, trigger y procedimiento de acuerdo con rúbrica.
4. Probar RLS, relaciones, operaciones SQL y consistencia; ejecutar advisors.
5. Documentar evidencias y cerrar F3 antes de F4.

Referencias: https://supabase.com/docs/guides/database/postgres/row-level-security
