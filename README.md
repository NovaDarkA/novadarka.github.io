# Shoefit
Aplicación académica Full Stack de zapatería. Desarrollo en develop/shoefit-fullstack; el diseño original permanece en los archivos HTML, CSS, JavaScript e imágenes.

## Desarrollo
Requisitos: Node.js 22 y npm.
- npm ci
- npm run check: comprobación TypeScript, pruebas unitarias y preparación del frontend.
- npm run build: copia los archivos públicos existentes a dist.
- Vercel: importar repositorio y desplegar una vista previa de la rama de desarrollo; usar vercel.json. No fusionar a main sin autorización.
- GET /api/health: comprobación del backend inicial (no de la base de datos).

## Configuración
Copiar .env.example a .env para ejecución local con las variables cargadas en el entorno del proceso; configurar variables en Vercel para despliegues. Usar un proyecto Supabase exclusivo de Shoefit y su URL y clave publishable. Nunca usar una clave secreta en el cliente.
La conexión real, esquema SQL, autenticación, CRUD y correo están pendientes. Las pruebas de transporte usan respuestas simuladas, no una base de datos real.

Ver docs/architecture.md para alcance y criterios de evaluación.
