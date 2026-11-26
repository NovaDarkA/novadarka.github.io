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
