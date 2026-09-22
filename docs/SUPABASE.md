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
