# Shoefit
Aplicación académica Full Stack de zapatería. Desarrollo en develop/shoefit-fullstack; el diseño original permanece en los archivos HTML, CSS, JavaScript e imágenes.

## Desarrollo
Requisitos: Node.js 22 y npm.
- npm ci
- npm run check: comprobación TypeScript, pruebas unitarias, preparación del frontend y validación de archivos, enlaces y fragmentos.
- npm run test:browser: pruebas Chrome en 1366 y 390 px después del build; requiere Google Chrome (CHROME_BIN puede indicar otro ejecutable Chromium). Usa fuentes de respaldo sin depender de Google Fonts; no sustituye revisión visual manual.
- node scripts/public-preview-smoke.mjs: prueba HTTP anónima de la vista previa pública existente; no envía credenciales ni sigue redirecciones.
- npm run build: copia los archivos públicos existentes a dist.
- Vercel: importar repositorio y desplegar una vista previa de la rama de desarrollo; usar vercel.json. No fusionar a main sin autorización.
- GET /api/health: comprobación del backend inicial (no de la base de datos).

## Configuración
Copiar .env.example a .env para ejecución local con las variables cargadas en el entorno del proceso; configurar variables en Vercel para despliegues. Usar un proyecto Supabase exclusivo de Shoefit y su URL y clave publishable. Nunca usar una clave secreta en el cliente.
La conexión real, esquema SQL, autenticación, CRUD y correo están pendientes. Las pruebas de transporte usan respuestas simuladas, no una base de datos real.

Ver docs/architecture.md para alcance y criterios de evaluación.

## Nuevas pantallas de Figma
- administracion.html: vista previa del panel con Productos, Clientes, Ventas y Empleados; no contiene datos privados ni permite operaciones. F4–F6 implementarán CRUD y autorización real.
- carrito.html: diseño de dos columnas inspirado en Erick's Caps y paleta Shoefit. Borrador local funcional desde el detalle de tenis grises; cantidad, eliminación y subtotales. Tallas ilustrativas y precio del catálogo estático. Sin pedidos, stock ni pagos reales; F3–F5 sustituirán datos y persistencia local por API/BD.

El catálogo provisional incluye botones Ver producto en inicio y colección. El detalle y carrito usan referencias a productos estáticos existentes; las botas no tienen precio publicado y su compra está deshabilitada. El SQL original del equipo se revisará y adaptará en F3, conservando las ocho entidades.

Búsqueda local por nombre/tipo/color, filtro de favoritos, favoritos persistentes en el navegador, enlaces de compartir limpios y diálogos informativos de pie de página. No representan cuentas ni registros reales de la base de datos. Información institucional pendiente se indica explícitamente.

## FE.01 — Encabezado y navegación
Menús desplegables Men, Women y Collection, y menú de cuenta uniforme en las siete pantallas. Men muestra únicamente referencias conocidas; Women indica que la colección está pendiente, sin inventar registros. Favoritos utiliza la búsqueda existente. Cuenta real y perfil se implementarán después. Pruebas de enlaces, apertura/cierre, teclado y adaptación.

## FE.02 — Diseño del catálogo
Filtros, ordenamiento, paginación, estado vacío, tarjetas y diseño adaptable. Se muestran cuatro modelos únicos existentes en lugar de ocho tarjetas duplicadas y el contador ficticio 98. Clasificación provisional derivada de sus nombres; tallas deshabilitadas hasta confirmar stock. Sin datos de BD. Pruebas ampliadas a 1366, 820 y 390 px.

## FE.03 — Detalle de producto
Galería seleccionable de cuatro vistas para tenis grises, una foto para los demás modelos; descripción basada en imágenes, tipo y disponibilidad por confirmar, talla ilustrativa y cantidad, subtotal local, productos relacionados, favoritos y compartir. No se inventan reseñas, inventario ni precio faltante. Agregar al carrito utiliza la cantidad elegida.
