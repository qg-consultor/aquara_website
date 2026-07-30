# Aquara Water Systems — mantenimiento y publicación en Neubox

## Cómo está construido

El sitio utiliza Vite para convertir el código fuente en archivos listos para
el navegador. Neubox publica únicamente el contenido final de `dist`.

- `index.html`: contenido, secciones, textos y metadatos.
- `index.css`: estilos visuales y responsive.
- `index.js`: navegación, formularios, modales y comportamiento.
- `src/`: componentes React y efectos WebGL.
- `public/`: archivos que deben copiarse sin transformación, incluido
  `send-contact.php`.
- `dist/`: resultado compilado. No debe editarse manualmente.

No existe un panel administrativo como WordPress. El mantenimiento se hace
modificando el código fuente, compilándolo y publicando una nueva versión.

## Flujo recomendado para cada actualización

1. Conservar el proyecto fuente en un repositorio privado.
2. Crear una rama o copia de trabajo para el cambio.
3. Modificar únicamente los archivos fuente.
4. Ejecutar:

   ```bash
   npm ci
   npm run build
   ```

5. Probar el contenido de `dist` en un entorno de pruebas.
6. Comprimir el contenido interno de `dist`, sin envolverlo en otra carpeta.
7. Respaldar la versión que está en producción.
8. Subir y extraer la nueva versión en el directorio del dominio.
9. Verificar escritorio, móvil, formulario, WhatsApp, videos, HTTPS y consola.
10. Registrar la fecha, los archivos cambiados y el responsable.

## Directorios en Neubox

- Producción: `/home/aquaramx/aquaraws.com`
- Pruebas: utilizar un subdominio con carpeta independiente, por ejemplo
  `/home/aquaramx/nuevo.aquaraws.com`

Nunca mezclar archivos de prueba con la carpeta de producción.

## Formulario

El navegador envía el formulario a `/send-contact.php`. Este archivo valida los
campos, aplica controles básicos contra spam y utiliza el servicio de correo de
PHP del hosting para entregar la solicitud a `hola@aquaraws.com`.

Después de cada publicación se debe realizar un envío real y confirmar:

1. Que el sitio muestre el mensaje de éxito.
2. Que el correo llegue a `hola@aquaraws.com`.
3. Que responder el correo use la dirección del prospecto.
4. Que no termine en spam.

Si Neubox deshabilita `mail()` o la entrega pierde confiabilidad, la siguiente
versión debe usar SMTP autenticado o la integración del CRM desde el servidor.
Las credenciales nunca deben colocarse en JavaScript ni dentro del ZIP público.

## Mantenimiento de seguridad

- Activar MFA en Neubox, correo y repositorio.
- Usar cuentas individuales; no compartir contraseñas.
- Mantener una copia local y otra externa de cada versión publicada.
- Revisar mensualmente dependencias con `npm audit`.
- Actualizar dependencias en una copia de prueba antes de producción.
- Mantener HTTPS y revisar el certificado.
- Probar el formulario y revisar spam de manera periódica.
- No alojar ZIP, SQL, `.env`, archivos fuente ni respaldos dentro del directorio
  público.
- Revisar registros de errores y actividad inusual.

## SEO y visibilidad en buscadores con IA

Después del lanzamiento:

1. Registrar `https://aquaraws.com/` en Google Search Console.
2. Enviar `https://aquaraws.com/sitemap.xml`.
3. Solicitar indexación de la página principal.
4. Validar los datos estructurados.
5. Medir consultas, clics, conversiones por formulario y clics a WhatsApp.
6. Desarrollar páginas individuales para cada solución y casos de éxito.

La optimización GEO se trabaja con la misma base que el SEO: contenido original,
experiencia demostrable, estructura clara, entidades bien identificadas y
respuestas concretas a preguntas reales del mercado. No depende de archivos
especiales para modelos de lenguaje.

## Alcance sugerido del servicio de mantenimiento

- Respaldo y control de versiones.
- Cambios de texto, imágenes, servicios y CTAs.
- Compilación, pruebas y publicación.
- Monitoreo de formulario, HTTPS y errores.
- Mantenimiento SEO técnico.
- Actualización de dependencias y revisión de seguridad.
- Reporte mensual de cambios y funcionamiento.

La automatización de leads, CRM, seguimiento, atribución y tableros corresponde
a una segunda fase independiente.
