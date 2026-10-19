# PisoCompartido

PWA privada para 2 compañeros de piso: pagos (renta y servicios), limpieza, tareas comunes y plaza de parking compartida.

## Uso
```bash
npm install
npm run dev      # desarrollo
npm test         # tests (Vitest)
npm run build    # genera dist/ (PWA instalable)
```
Para instalarla en el móvil, publica `dist/` en un hosting con HTTPS (Vercel, Netlify, Cloudflare Pages). Luego, en Safari (iOS) o Chrome (Android), abre la URL y usa **Compartir → Añadir a pantalla de inicio**.

## Sincronización (opcional)
1. Crea un proyecto en Supabase y ejecuta `supabase/migrations/001_eventos.sql`.
2. Copia `.env.example` a `.env` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

Sin estas variables, cada móvil funciona solo en local.

## Seguridad
- Cada usuario tiene su propia clave personal (PBKDF2, 600k iteraciones). Nunca sale del móvil y el otro usuario no la conoce.
- Los datos del piso se cifran con AES-256-GCM. El servidor solo guarda blobs ilegibles.
- El emparejamiento se hace con un QR que caduca a los 5 minutos. El servidor rechaza un tercer dispositivo.
- La app se bloquea automáticamente al pasar a segundo plano o tras 2 minutos sin uso, y aplica un retardo progresivo tras 5 fallos.
- Privacidad: `public/privacidad.html`. Cabeceras CSP: `public/_headers`.
