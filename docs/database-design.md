# F3 — Base de datos Shoefit

Estado: esquema base aplicado y verificado en el proyecto independiente Shoefit. Fecha local: 25/11/2026. Las notas iniciales a continuación son históricas.

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

## F3 — segunda entrega de borradores
Se mantiene una única tabla usuario y rolez con cliente, empleado y administrador, tal como se indicó en el SQL original. No se añade una tabla de administradores ni se almacenan contraseñas. Los usuarios no tienen permiso para modificar rolez. Se añaden políticas administrativas por rol de la fila propia, sin SECURITY DEFINER, y se conservan lecturas propias de clientes. No se habilitan escrituras de pedidos a usuarios finales todavía.
- database/drafts/02_logic.sql: políticas CRUD por rol, campo color (requerido por el frontend), vistas JOIN security_invoker, triggers de precio y total, procedimiento real recalcular_total_pedido (solo servidor). Los detalles bloquean su pedido, conservan el precio registrado y no se alteran si está cerrado. No resuelve inventario: activo significa visible, no existencia.
- database/drafts/03_catalog_seed.sql: cuatro modelos existentes, precios conocidos, color e imágenes originales; sin proveedor, stock ni precio faltante inventado.
- database/tests/: fixture de Auth mínimo, identidades ficticias y prueba transaccional SQL. CI PostgreSQL 17 aislada sin credenciales de Supabase. Verifica ocho tablas RLS, JOIN, trigger insert/update/delete, precio no manipulable, FK de pedido/cliente, procedimiento, CRUD de producto/proveedor y permisos de cliente/administrador. No equivale a una prueba de Supabase Auth real; habrá que repetir en Shoefit dedicado.
Pendientes: proyecto Supabase independiente y migraciones reales, alta de perfiles y autenticación, reglas de inventario y tallas, venta/pedido transaccional con stock, verificación de permisos y advisors reales. No se toca ATLAS. No declarar F3 completada antes de validar en el proyecto de Shoefit.

## Implementación y verificación de F3 (25/11/2026)
Proyecto independiente Shoefit, PostgreSQL 17, us-east-1, coste de creación cotizado $0 mensual; ATLAS no se modificó. Tabla usuario con rolez cliente/empleado/administrador. Cuatro migraciones aplicadas y registradas por Supabase, copiadas a supabase/migrations con las versiones reales 20261126024202, 20261126024246, 20261126024320 y 20261126024450. Ocho tablas, RLS en todas, cuatro referencias de catálogo originales (tres con precio, una sin precio), proveedor y talla no inventados. Consultas JOIN en vistas security_invoker v_pedido_detalle y v_catalogo_proveedor. Función de autorización privada basada en rolez, privilegios explícitos; rol no modificable por cliente. Dos triggers para validar detalles y calcular totales, procedimiento privado de recálculo; operaciones de pedido restringidas al backend de confianza. El test database/checks/02_integrity_rls.sql pasó tras la última migración: catálogo anónimo, aislamiento de clientes, rechazo de escalación, CRUD de producto/proveedor como administrador, JOIN, precio autoritativo, FK y totales. Fixtures revertidos; quedaron cuatro productos y cero usuarios/pedidos/proveedores. El test usa identidad SQL simulada, no valida sesiones HTTP de Auth. Advisors: cero avisos de seguridad; cuatro índices sin uso informativos por falta de actividad, conservados para FK. Faltan inventario/tallas reales o su modelo de disponibilidad, alta y autenticación reales, y completar validación de operaciones de los módulos clientes/empleados/ventas. No se conectó Vercel a la BD ni se inició F4. No publicar credenciales.
