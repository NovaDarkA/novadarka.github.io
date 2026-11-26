# Shoefit — arquitectura y alcance

Proyecto académico, entrega 30 de noviembre de 2026. El diseño existente se conserva.

## Capas
- Frontend HTML, CSS y JavaScript existente; los recursos públicos se copian a dist por lista permitida.
- Backend: funciones Node.js/TypeScript de Vercel en api/; separar validaciones, servicios y acceso a datos cuando se implementen.
- Datos: PostgreSQL en un proyecto Supabase dedicado exclusivamente a Shoefit; Auth para sesiones y RLS para autorización. Las credenciales privadas nunca llegan al navegador.
- Correo: proveedor transaccional pendiente; enviar aviso al autenticar correctamente, sin contraseñas ni tokens.
- El endpoint GET /api/health solo comprueba que la función responde, no la conectividad de la base de datos.

## Flujo Git
Trabajar únicamente en develop/shoefit-fullstack. No fusionar con main sin aprobación del propietario y pruebas completas. Publicar una vista previa de la rama antes de considerar integración.

## Criterios de aceptación de la rúbrica
- Inicio, colección y detalle consultan datos reales de la base.
- CRUD completo desde interfaz en productos y categorías, con roles y validaciones.
- Consulta JOIN de catálogo, disparador de auditoría y procedimiento almacenado PostgreSQL real.
- Registro, login, datos del usuario, logout, protección de pantallas y API; probar acceso anónimo y sin permisos.
- Notificación por correo tras login válido.
- Deployment gratuito, navegación y exposición.
- Documentar pruebas y verificar cada criterio; no declarar completado por existir solo código.

## Orden
1. Preparar base del repositorio y verificar build.
2. Definir esquema y datos iniciales; aislar proyecto de Supabase y probar políticas.
3. Implementar API e integrar frontend existente.
4. Completar administración, autenticación y correo.
5. Desplegar vista previa y probar la rúbrica.

## Ejecución
`node scripts/build-static.mjs` genera dist sin mover archivos originales.
Configurar Vercel con la rama de desarrollo y las variables de entorno cuando corresponda.
No hay despliegue ni conexión de datos todavía.

## Ampliación de alcance (25/11/2026)
Añadir las dos pantallas restantes del diseño Figma: administración (Productos, Clientes, Ventas y Empleados; Agregar, Eliminar y Modificar) y carrito. F3 debe contemplar entidades de clientes, empleados, ventas y detalles, carritos y detalles, además de catálogo e inventario. Los empleados requieren perfiles/roles autorizados; no duplicar credenciales. Las pantallas actuales son vistas previas sin operaciones ni datos sensibles. F4–F6 implementarán API, persistencia, validación y permisos; no confiar en controles HTML para autorización. El diseño de contenidos del panel gris no está especificado por Figma; se preparó un estado informativo hasta definir datos reales.

## Revisión del carrito
Referencia visual: carrito Erick's Caps aportado por el usuario. Mantener paleta Shoefit, productos a la izquierda y resumen a la derecha, versión móvil apilada. Borrador local limitado al producto de detalle existente, con tallas ilustrativas, cantidades y cálculo en centavos; no se confirma inventario, envío, compra ni pago. F3–F5 deben conectar catálogo y variantes reales, persistencia, cálculo autoritativo del servidor y autorización. No incluir WhatsApp ni datos de Erick's Caps.

## Esquema original entregado por el equipo (25/11/2026)
Fuente: Zapateria 1 .sql. Ocho tablas: user, EMPLEADO, PROVEEDOR, CLIENTE, PRODUCTO, PEDIDO, PEDIDO_Productos y VENTA. Conservar sus entidades y propósito; las propuestas previas son extensiones sujetas a necesidad, no reemplazos. PRODUCTO incluye proveedor, nombre, marca, talla, precio, tipo e imagen. PEDIDO y PEDIDO_Productos representan cabecera y detalle; VENTA relaciona cliente, empleado y producto. Adaptación pendiente: identidad PostgreSQL, claves foráneas de tipos compatibles (proveedor y pedido), separadores de restricciones, importes numeric(12,2), estados y roles definidos, relación segura con Supabase Auth sin contraseñas en texto plano, RLS, restricciones e índices. No ejecutar DROP TABLE ni DROP DATABASE del archivo. No contiene datos iniciales ni trigger/procedimiento; implementarlos según rúbrica. Archivo original no publicado en GitHub porque contiene identificadores académicos. Sin ejecución de DDL ni modificaciones a Supabase en F2.
## Selección de productos
Se añaden enlaces de selección a todas las tarjetas actuales de inicio y colección; la página de detalle recibe un identificador temporal y muestra el producto correspondiente. Los precios existentes se conservan; botas sin precio confirmado no se pueden añadir. Las tarjetas repetidas del catálogo original mantienen el mismo identificador provisional, no se inventan SKU ni existencias. El catálogo local será reemplazado por consultas reales a PRODUCTO.

## Continuación de frontend antes de F3
Búsqueda y favoritos operan sobre cuatro referencias únicas provisionales; no duplicar los registros por tarjetas repetidas. Compartir genera URL canónica de detalle sin UTM. Pie de página: ayuda y guía basadas en funcionamiento actual; información institucional no proporcionada se señala como pendiente. No inventar historia, vacantes, valores, clasificación por género, existencias ni información empresarial. Autenticación y CRUD servidor siguen pendientes.
