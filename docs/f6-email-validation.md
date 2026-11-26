# F6 — Recuperación de contraseña y notificación por correo
Fecha: 26/11/2026. F5 cerrada por confirmación manual del usuario.
## Implementación
- POST /api/recovery: action=request (email), action=reset (email, código de seis dígitos, contraseña de 8–128 caracteres). Validación de origen, límites de entrada y rate limit de Auth. El código se verifica con type=recovery antes de modificar la contraseña; el token de recuperación queda exclusivamente en el servidor. Se solicita revocación global de sesiones y se elimina la cookie local; los JWT previos pueden seguir válidos hasta su expiración.
- recuperar.html: formulario de dos etapas, confirmación de contraseña, reenvío, estados accesibles, sin persistencia de credenciales.
- Login válido: aviso transaccional opcional por API Resend al email devuelto por Supabase Auth, sin contraseña ni token. Sin proveedor configurado o con dirección reservada .example, no se intenta enviar. Fallas de entrega no impiden login; tiempo máximo adicional de 2 segundos para llamada al proveedor.
- Pruebas unitarias nuevas de recuperación, código inválido, origen, contraseña, límites y notificación; pruebas de salida y navegador ajustadas.
## Configuración externa pendiente (sin compras)
1. En Supabase Authentication > Email Templates > Reset password, configurar asunto Shoefit y cuerpo que muestre el código de recuperación: <p>Tu código de recuperación de Shoefit es: <strong>{{ .Token }}</strong></p>. Mantener OTP de seis dígitos. No incluir enlaces de confirmación que consuman el código.
2. Configurar SMTP personalizado para destinatarios ajenos al equipo de Supabase. Su servicio por defecto solo entrega a miembros del equipo; no usar las dos cuentas .example para probar recepción. No cambiar las cuentas existentes sin autorización.
3. Para aviso de login, configurar proveedor Resend en plan gratuito si hay remitente verificable; registrar RESEND_API_KEY y SHOEFIT_EMAIL_FROM solo en variables privadas de Vercel (Preview). No escribir claves en GitHub. Resend requiere verificar dominio para destinatarios generales; no adquirir dominio ni plan de pago sin aprobación.
4. Usar una cuenta de prueba con buzón real controlado por el usuario. Verificar llegada del código, rechazo de código inválido, nueva contraseña, login con la nueva contraseña y aviso recibido. Verificar que el login inválido no produce aviso. No afirmar que un HTTP 202 equivale a entrega real.
Referencias: https://supabase.com/docs/guides/auth/auth-email-templates ; https://supabase.com/docs/guides/auth/auth-smtp ; https://resend.com/docs/api-reference/emails/send-email
## Cierre
Código incorporado en rama de desarrollo. CI y recepción de correo real pendientes de evidencia. F7 no debe comenzar hasta cerrar F6. No se cambió la rama main, datos de producción, cuentas demo ni configuración de Supabase. Demora de sesión diferida.

## Revalidación de despliegue y configuración
- Commit 880c108aaf38b2385ced877db6329a1e7242f3e3: Vercel READY y estado GitHub Vercel success. GET /recuperar.html, /js/recovery.js y /api/health HTTP 200; formulario y controlador presentes.
- Variables Preview verificadas por nombre: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY; faltan RESEND_API_KEY y SHOEFIT_EMAIL_FROM. Supabase Shoefit activo. El conector no expone edición de SMTP/plantillas y no se encontró conector Resend.
- Commit 24f57983d889c7e03b80b43ac70eed01f20766a4 agrega prueba de navegador de flujo de recuperación con servidor simulado: solicitud, confirmación desigual, código inválido, cambio aceptado y limpieza de campos. Ejecución CI no confirmada.
- Para demostración limitada a un buzón propio, evaluar el remitente de pruebas onboarding@resend.dev; comprobar las restricciones de destinatario antes de configurar. No comprar dominio. La alternativa general exige un remitente verificado.
- Configuración manual: https://supabase.com/dashboard/project/lmgtiekmgghrnzscwmuz/auth/templates ; https://supabase.com/dashboard/project/lmgtiekmgghrnzscwmuz/auth/smtp ; https://vercel.com/shoefit1/shoefit/settings/environment-variables ; https://resend.com/api-keys . El propietario debe introducir las credenciales directamente en los paneles. No compartir claves por chat.
- No se enviaron mensajes reales ni cambiaron cuentas. F6 no cerrada.

## Pruebas unitarias ejecutadas localmente — 26/11/2026
- Se recuperaron seis archivos de servicios y tres archivos de pruebas de la rama de desarrollo; se verificaron los nueve hashes Git de los blobs contra GitHub antes de ejecutar.
- Node.js v22.16.0: `node --test tests/*.mjs` en una copia local parcial y aislada de esos nueve archivos: 13 pruebas aprobadas, 0 fallidas, 0 omitidas (6 sesión, 4 recuperación, 3 notificación). Transporte simulado; no se enviaron correos ni se modificaron usuarios.
- Commit 09a62fb4506da4c4eba7e36886d79a97eee67036: Vercel READY, GitHub estado Vercel success. La consulta disponible de workflows no devolvió ejecuciones; no se acredita aprobación del navegador ni del CI completo por esta prueba local.
- La configuración Preview sigue sin RESEND_API_KEY y SHOEFIT_EMAIL_FROM. Se mantiene pendiente alta/configuración del proveedor, SMTP/plantilla de Supabase y recepción efectiva en buzón de prueba. No iniciar F7 hasta cerrar F6.

## Validación focalizada del formulario en navegador — 26/11/2026
- Se verificaron los hashes de blobs Git de recuperar.html (09b5fa439b7c9d7ab0d152d6c8ed2afd9a45016d) y recovery.js (d064602bec117322839307ace129795f86ede922).
- Chromium y Playwright: PASS en 1366 y 390 px. Se cargó en memoria el HTML sin sus recursos externos y el controlador íntegro; fetch simulado, sin red ni usuarios reales. Se verificaron estado inicial, email inválido sin petición, solicitud, contraseñas diferentes sin petición, OTP incorrecto, HTTP 429, HTTP 503, reenvío con limpieza de campos, cambio aceptado y limpieza final. Seis llamadas simuladas por ancho, sin errores JavaScript.
- La navegación local fue bloqueada por el entorno y el repositorio no pudo clonarse por falta de DNS. La prueba en memoria es focalizada, no acredita diseño visual completo, acceso público, CI integral ni entrega de correo. GitHub workflow_runs vacío para 24f5798 y 967d6e0.
- F6 permanece abierta por SMTP, remitente, configuración de correo y prueba real; CI integral sigue sin evidencia. No se cambió código funcional ni cuentas y no se inició F7.

## Configuración de Resend y verificación del despliegue — 26/11/2026
- El usuario creó la cuenta Resend y guardó la clave como variable sensible RESEND_API_KEY en Preview (rama de desarrollo) y Production. El asistente agregó SHOEFIT_EMAIL_FROM=onboarding@resend.dev exclusivamente a Preview. No se recuperaron ni expusieron claves. No se publicó producción.
- Despliegue nuevo dpl_4p79JwevorQC6UpEkrw3B2VS5aqX, commit 8bd859ec29282972b3d841720fc65377ca6ec957: READY. Alias de desarrollo: /api/health HTTP 200, /api/recovery GET HTTP 405 con Allow POST, respuesta sin caché. Esto acredita publicación, no entrega de correo.
- Consulta agregada de auth.users: 2 usuarios confirmados, ambos con direcciones reservadas .example; no hay usuario de prueba con correo real. Se mantienen intactos los dos accesos existentes.
- SMTP y plantilla de recuperación: pantalla abierta por el usuario, guardado no confirmado. El conector Supabase no ofrece operaciones de configuración Auth/SMTP/plantillas. Para la plantilla Reset password, asunto Shoefit: código de recuperación y cuerpo HTML con {{ .Token }} (seis dígitos), sin ConfirmationURL. El remitente de prueba Resend solo permite demostrar entrega al propio buzón registrado. Registrar una cuenta cliente de prueba con ese buzón, verificar inicio de sesión, correo recibido y recuperación, sin modificar cuentas originales. No adquirir dominio ni plan.
- F6 sigue abierta. La herramienta de workflows de GitHub consulta únicamente ejecuciones asociadas a pull requests; una lista vacía no demuestra ausencia de CI de tipo push.
