# Shoefit — Validación técnica del diseño (FE.08–FE.09)
Fecha local: 25/11/2026. 
## Versión verificada
- Código: [a34e24e](https://github.com/NovaDarkA/novadarka.github.io/commit/a34e24ea298ec86836134babae77e6e225334aa1).
- [Ejecución CI 45741416055](https://github.com/NovaDarkA/novadarka.github.io/actions/runs/45741416055), job 139647068835: todos los pasos exitosos.
- Vercel: dpl_12MerU778FqY2oyqt7PZkfwdCfJS READY, preview. [Vista previa](https://shoefit-git-develop-shoefit-fullstack-shoefit1.vercel.app).
- La rama main permanece sin cambios; no se promovió a producción.

## Resultados técnicos
| Comprobación | Resultado |
| --- | --- |
| TypeScript | Aprobada |
| Pruebas unitarias | 23/23 |
| Pruebas estáticas | 14/14 |
| Referencias locales (rutas, fragmentos e imágenes) | 474 comprobadas |
| Rutas HTML generadas | 15 |
| Pantallas normales | 11 |
| Chrome a 1366, 1024, 820, 650, 390 y 320 px | 66/66 combinaciones de página y viewport aprobadas |
| Página 404 | Verificada a los seis tamaños; respuesta HTTP 404 para ruta inexistente |
| Rutas públicas | 15/15 documentos HTTP 200 al consultar su URL directa; 3 son redirecciones HTML de compatibilidad |
| Navegación por teclado, menú y diálogos | Aprobada por comprobaciones automatizadas |
| Recursos CSS e imágenes | Cargados correctamente; fuentes externas bloqueadas en CI intencionalmente |
| Salida sin archivos del servidor | Aprobada |
| Inicio y API de salud anónimos | HTTP 200 |

La prueba nueva de salto al contenido falló en dos ejecuciones iniciales. Se hizo fijo el enlace al enfocarlo y se activó el navegador antes de comprobar la geometría y el foco. La ejecución indicada arriba pasó sin omitir esa prueba.

## Estructura
Los HTML fuente se agrupan en frontend/pages/{tienda,compra,cuenta,administracion,ayuda,compatibilidad}. Encabezado común en frontend/components/header.html, recursos en frontend/assets/{css,js,img}, build explícito en scripts/frontend-manifest.mjs y scripts/build-static.mjs. Los HTML públicos conservan sus URL en dist/. Ejecutar npm ci y npm run dev para vista previa local. No abrir directamente las plantillas. No se alteró SQL ni el backend.

## Revisión funcional del frontend
Inicio, colección y detalle: navegación, selección, filtros, búsqueda, galería, favoritos locales y compartir.
Carrito y pedido: cantidades, eliminación, subtotales y revisión sin confirmar operaciones reales.
Cuenta: validación de formularios, perfil, favoritos, historial vacío y recuperación visual.
Administración: cuatro módulos, formularios y diálogos de eliminación sin guardar datos.
Información: siete accesos desde pie de página, preguntas frecuentes, guía y error 404.

## Criterios pendientes de aprobación
- La validación técnica FE.08–FE.09 está aprobada por CI y HTTP. Las pruebas automatizadas no sustituyen una comparación visual humana de todos los píxeles contra Figma, ni pruebas en hardware real. Las pantallas FE.01–FE.07 se conservan conforme a las aprobaciones anteriores; la revisión final del usuario aún no se ha registrado.
- Contenido institucional, catálogo femenino, inventario y fotos faltantes siguen pendientes de datos oficiales.
- Base de datos, autenticación real, persistencia, CRUD y correos son fases posteriores; la API health no prueba la BD.
- Antes de iniciar F3, obtener aprobación del cierre visual; no fusionar main sin autorización expresa.
