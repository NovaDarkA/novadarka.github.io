# F5 — Validación integral del proyecto escolar

## Estado
- CI 45755307129: SUCCESS; navegador a seis anchos, CRUD administrativo con API simulada, perfil, pedido, cancelación y reintento.
- En la base de desarrollo Shoefit se creó un producto explícitamente de demostración, slug `prueba-escolar-tenis`, precio 100 MXN, talla 26, tres unidades iniciales. No representa mercancía real. Los cuatro modelos originales no fueron modificados.
- GET /api/products?slug=prueba-escolar-tenis y GET /api/availability?slug=prueba-escolar-tenis: HTTP 200 en Vercel.
- Se verificó mediante SQL en Supabase, con los identificadores de las dos cuentas existentes y claims simulados, el CRUD de productos y proveedores, la visibilidad administrativa del pedido, reserva y cancelación. La transacción se revirtió; cero pedidos persistentes y tres unidades de demostración intactas.
- Esto no sustituye la prueba HTTP autenticada desde el navegador.

## Verificación manual pendiente
Usar exclusivamente el entorno de desarrollo y las cuentas de demostración ya creadas; no registrar credenciales en archivos.
1. Iniciar sesión como administrador. En Proveedores, agregar una marca temporal (por ejemplo, Prueba F5), modificar el nombre, y eliminarla. Comprobar la tabla después de cada acción.
2. En Productos, agregar un producto temporal con nombre y slug únicos, precio de prueba y Publicado desmarcado. Cambiar su precio y eliminarlo. No usar los cuatro productos originales ni el producto de demostración para esta eliminación.
3. Cerrar sesión e ingresar como cliente. Abrir `/sorprendeme.html?producto=prueba-escolar-tenis`. Elegir talla 26 y una unidad. Agregar al carrito, revisar y confirmar. Debe mostrarse un número de pedido y 100 MXN, sin cobro.
4. En Mi cuenta > Mis pedidos, verificar el pedido pendiente. En sesión administrativa independiente, comprobar que el pedido aparece y que quedan dos unidades de demostración.
5. Cancelar el pedido desde la cuenta cliente. Verificar estado Cancelado y que el inventario vuelve a tres unidades. El pedido cancelado queda como registro de auditoría.
6. Probar el guardado de un dato del perfil de cliente de prueba y restaurar el valor anterior. No editar correo ni rol.

No iniciar F6 hasta confirmar los resultados pendientes. La demora de login/logout sigue diferida por decisión del usuario. Despublicar el producto de demostración tras las pruebas cuando ya no sea necesario; no eliminar registros relacionados con pedidos.

## Validación real ya observada
Pedido #13, tres unidades, 300 MXN; compra y cancelación reales confirmadas, actualización de perfil HTTP 200, PATCH de inventario HTTP 200 posterior a cancelación (20 existencias actuales). Falta evidencia de altas, bajas y modificación de segunda tabla por HTTP.

## Prueba automatizada pendiente
Desde una terminal local con Node.js 22, definir SHOEFIT_ADMIN_PASSWORD sin escribir la contraseña en el historial y ejecutar `node scripts/live-admin-crud.mjs`. El script usa exclusivamente el preview, crea un proveedor y un producto no publicado con identificadores únicos, consulta, modifica, elimina y verifica ausencia en las dos tablas. Intenta limpiar únicamente esos registros temporales incluso ante una respuesta perdida. No utiliza credenciales en el código ni altera registros preexistentes. Resultado real pendiente de ejecución desde un entorno con acceso HTTP POST/PATCH/DELETE.

## Ajuste de integración
Filtro de tallas conectado a variantes activas con existencias positivas y precio confirmado. El catálogo paginado incluye las variantes mediante una sola consulta; el detalle y checkout conservan sus comprobaciones independientes de inventario. Validación automatizada en curso. La prueba HTTP administrativa sigue pendiente.

## Revalidación 26 de noviembre de 2026
- Vercel GET /api/health: HTTP 200, shoefit-api disponible.
- GET /api/products?page=1: HTTP 200, cinco registros (incluido el producto de demostración), variantes incluidas y sin página adicional.
- GET /api/availability?slug=prueba-escolar-tenis: HTTP 200, precio 100 MXN, talla 26, 20 existencias y disponible. Este es el inventario actual, posterior al ajuste administrativo documentado; no debe confundirse con las tres unidades iniciales.
- La herramienta de consulta de Vercel devolvió 401 en la ruta administrativa sin sesión y no permite ejecutar el flujo POST/PATCH/DELETE autenticado. No se afirma que el CRUD real esté aprobado. No se crearon ni eliminaron registros en esta revisión.
- Criterio restante de F5: evidencia HTTP autenticada de alta, consulta, modificación y eliminación de registros temporales en Productos y Proveedores. Mantener F6 bloqueada hasta validar. La demora de sesión sigue diferida.

## Cierre F5 — 26/11/2026
El usuario confirmó que realizó las operaciones administrativas pendientes de creación, modificación y eliminación en Productos y Proveedores desde el panel. Se acepta su prueba manual como evidencia de cierre F5 y se autoriza continuar F6. No se afirma que el script HTTP independiente haya sido ejecutado por el asistente. La demora de login/logout permanece diferida.
