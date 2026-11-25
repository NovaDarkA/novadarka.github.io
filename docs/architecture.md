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
