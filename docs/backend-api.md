# F4 — API REST y criterios de cierre

## Contratos implementados
Todos los endpoints devuelven JSON salvo la página protegida. Errores: `{error: codigo}`, sin detalles privados. Las mutaciones exigen origen coincidente y las operaciones privadas verifican sesión y rol; RLS y RPC verifican acceso en PostgreSQL. No se usa service_role en Vercel.

| Ruta | Método | Acceso | Contrato |
|---|---|---|---|
| /api/health | GET | Público | Salud de API |
| /api/products | GET | Público | data catálogo activo; ?slug=... detalle; ?page=1 paginación de 50 |
| /api/availability?slug=... | GET | Público | data con precio y variantes reales |
| /api/admin?module=... | GET | Admin | data, page, hasMore; id opcional |
| /api/admin?module=... | POST | Admin | Campos de módulo; data registro creado |
| /api/admin?module=...&id=... | PATCH/DELETE | Admin | Campos permitidos / eliminación de un registro |
| /api/profile | GET/PATCH | Cliente | Perfil propio; nombre, ap, am, calle, numero, colonia, cp, talla |
| /api/orders | GET | Cliente | Historial propio y detalles |
| /api/orders | POST | Cliente | key UUID + items [{id_variante,cantidad}]; idempotente |
| /api/orders | PATCH | Cliente/Admin | id, estado; cliente cancela propio, admin entrega/cancela |
| /api/login | POST | Público | email, password; cookie y redirect según rol |
| /api/register | POST | Público | email, password; alta exclusivamente cliente |
| /api/session | GET | Autenticado | Perfil y rol real |
| /api/logout | POST | Autenticado | Invalida sesión local y limpia cookie |
| /administracion.html | GET | Admin | Función de servidor; anónimo redirige, cliente recibe 403 |

Módulos admin: productos, clientes, empleados, ventas, proveedores, variantes (CRUD); pedidos y usuarios solo lectura. La clasificación del producto se conserva en tipo_prod del esquema aprobado, no se inventa una entidad adicional. La creación de cuentas administrativas no se expone por HTTP público. Pedidos se modifican solo por transición validada; no por CRUD genérico. Datos de perfil no permiten editar identidad, correo ni rol. Los precios, totales y existencias se determinan en la base, no se confían al carrito.

## Evidencia y limitaciones
- Las pruebas SQL 02–05 verifican integridad, RLS, administración, checkout, cancelación y perfil con datos temporales revertidos. El catálogo real conserva sus cuatro productos; inventario aún vacío.
- El checkout utiliza transacción, bloqueo y clave de idempotencia. Falta prueba concurrente con dos sesiones independientes y prueba HTTP autenticada con cuentas reales. No se declara cerrada F4.
- El código de las API está implementado; la conexión visual, edición de formularios y navegación por datos reales corresponde a F5 y no se modifica antes del cierre.
- Las dos cuentas demo todavía no existen debido al bloqueo anterior de la herramienta. Crear mediante Authentication > Users y configurar el rol administrativo mediante administración autorizada, no mediante registro público. No guardar contraseñas en código o Notion.
- Recuperación de contraseña y correo al iniciar sesión pertenecen a F6; publicación definitiva F7; pruebas de extremo a extremo del sitio F8.
