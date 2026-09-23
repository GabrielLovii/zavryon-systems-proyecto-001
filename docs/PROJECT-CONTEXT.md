# Contexto del proyecto

## Propósito

**Control de Abastecimiento** es un MVP de ZAVRYON SYSTEMS para gestionar pedidos, recepciones, pagos, proveedores, catálogo, fuentes, vencimientos, agenda, alertas e historial. La interfaz está pensada para uso operativo en escritorio y tablet, con soporte PWA para Android.

## Stack y estructura

- **Next.js 14.2** con App Router, **React 18.3** y TypeScript estricto.
- Tailwind CSS, Heroicons y `pdfjs-dist`.
- Tests con el runner nativo de Node (`node --test`).
- Persistencia operativa actual: `localStorage` versionado de la demo, con guardado, copia de recuperación y restauración.
- Supabase está preparado para lecturas y health check, pero todavía no es la fuente de verdad de la aplicación.

Rutas importantes:

- `app/`: entrada, estilos globales y endpoints Next.js.
- `components/`: layout, dashboard y flujos operativos.
- `lib/demo-store.ts`: estado y persistencia local versionada.
- `lib/mock-data.ts`: datos iniciales de demostración.
- `lib/supabase.ts`: configuración y lecturas preparadas de Supabase.
- `public/`: logo, manifest y service worker.
- `tests/`: regresiones de persistencia, fuentes, SSRF y exportaciones.
- `docs/`: contexto, historial, recuperación y documentación operativa.

## Cadena de despliegue

```text
GitHub (main) -> Vercel (build y despliegue) -> Supabase (integración preparada)
```

El repositorio remoto es `https://github.com/GabrielLovii/zavryon-systems-proyecto-001.git`. Los cambios llegan a `main`; Vercel construye el proyecto y publica el despliegue. Supabase aporta el proyecto preparado `quigcuskwgaesizbtryv` cuando la integración y sus permisos estén activados.

## Limitación actual de persistencia

La aplicación continúa usando `localStorage` para el flujo principal. Supabase dispone de URL pública, cliente tolerante y lecturas iniciales, pero faltan autenticación, mapeo explícito de permisos, políticas RLS verificadas para el flujo completo y la sustitución controlada del store local. No presentar la demo local como persistencia multiusuario o como respaldo centralizado.

## Variables de entorno

Definidas en `.env.example` y configuradas localmente en `.env.local` (este último nunca se documenta ni se versiona):

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publicable para el cliente.

No copiar valores reales en documentación, commits, issues, logs, artefactos de CI ni capturas. Nunca usar una `service_role` o secret key en el navegador, GitHub o Vercel como variable pública.

## Reglas operativas

1. Ejecutar `npm ci`, `npm run build`, `npx tsc --noEmit` y `npm test` antes de liberar.
2. El workflow `.github/workflows/quality.yml` debe bloquear la calidad de cada push o PR a `main`.
3. Cada cambio debe añadir una entrada a `docs/PROJECT-LOG.md` antes de reportarse como completado.
4. Registrar commit, archivos, verificación, despliegue y referencia de rollback; nunca registrar secretos.
5. No editar `.env.local` como parte de cambios de código o documentación.
6. Ante una regresión, seguir `docs/ROLLBACK.md`; preferir `git revert` y rollback de Vercel antes que reescribir `main`.
