# Supabase

## Proyecto

- Project ref: `quigcuskwgaesizbtryv`
- URL: `https://quigcuskwgaesizbtryv.supabase.co`
- Esquema esperado: configuración, perfiles, proveedores, productos, relaciones, pedidos, recepciones, vencimientos, pagos, fuentes, candidatos y auditoría.

## Variables

Copia `.env.example` a `.env.local` y completa la publishable key desde **Project Settings > API**:

```text
NEXT_PUBLIC_SUPABASE_URL=https://quigcuskwgaesizbtryv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La publishable key puede viajar al navegador; RLS debe proteger todas las tablas. Nunca uses ni publiques una `service_role` o secret key en este proyecto, el cliente, logs o GitHub.

## Ejecución y migración

```bash
npm.cmd install
npm.cmd run dev
```

El esquema ya creado no se reemplaza desde la aplicación. Si se dispone de la migración SQL original, aplícala una sola vez desde el SQL Editor de Supabase o con el flujo de migraciones del proyecto, verificando antes el project ref `quigcuskwgaesizbtryv`. No ejecutar una migración destructiva contra producción sin respaldo.

## Integración actual

`lib/supabase.ts` expone `isSupabaseConfigured`, un cliente tolerante a variables ausentes y lecturas preparadas para `business_settings`, `suppliers`, `products` y `orders`. La demo continúa usando `localStorage` hasta que exista autenticación y mapeo explícito de permisos/RLS.

`/api/supabase-health` comprueba configuración y una lectura segura de `business_settings` sin devolver claves. La pantalla `Usuarios` muestra si la conexión está activa o si la app sigue en modo demo local.

## Guardado en la nube (app_state)

Migración `app_state_cloud_sync` (2026-09-24, aditiva):

- `public.app_state`: estado completo de la app por cuenta (`user_id`), con `revision` para detectar escrituras concurrentes.
- `public.app_state_history`: últimas 30 versiones por cuenta, guardadas por trigger antes de cada actualización.
- RLS: cada cuenta solo lee/escribe su fila (`auth.uid() = user_id`); `anon` sin acceso.

La app (`lib/cloud-sync.ts`) guarda local al instante y sube a los ~1,5 s; sin conexión reintenta al volver. Si la nube y el dispositivo cambiaron a la vez, pregunta cuál conservar y descarga un respaldo del descartado.

Requisitos en el entorno de despliegue (Vercel → Settings → Environment Variables) y en `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys → publishable).
- Supabase → Authentication → URL Configuration: `Site URL` con el dominio de producción y ese dominio en `Redirect URLs` (para los enlaces de confirmación y recuperación de contraseña).
