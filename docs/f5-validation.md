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
