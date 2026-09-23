# Historial del proyecto

Registro cronológico, legible para el propietario y enlazado con `CHANGELOG.md`. Los identificadores de commit son referencias públicas del repositorio; no se guardan secretos ni valores de entorno.

## Regla obligatoria

Toda modificación futura debe añadir una entrada aquí **antes de reportar la tarea como completada**. La entrada debe incluir fecha, cambio, motivo, archivos, verificación, despliegue y referencia de rollback.

## Entradas

### 2026-09-22 — `f92fac5e2e4024bbf7dd746ca4a2f75e9ffa19d2` — despliegue verificado

| Campo | Detalle |
|---|---|
| Cambio | Edición de pedidos y shell responsive; ajustes del service worker. |
| Por qué | Permitir actualizar pedidos y mejorar el uso responsive en el despliegue actual. |
| Archivos | `app/globals.css`, `app/page.tsx`, `components/dashboard.tsx`, `components/order-editor.tsx`, `components/sidebar.tsx`, `public/sw.js`. |
| Verificación | Commit presente en `main`; despliegue verificado según la referencia operativa del proyecto. |
| Despliegue | Vercel, cadena desde GitHub `main`; commit desplegado/verificado `f92fac5e`. |
| Rollback | Revertir `f92fac5e` con el procedimiento de `docs/ROLLBACK.md` y recuperar en Vercel el último deployment sano. |

### 2026-09-22 — `f76af2c0958cfc0ee1a55eaa90f78e80f2d45a91` — baseline anterior

| Campo | Detalle |
|---|---|
| Cambio | Autosave y recuperación, alertas, extracción segura de fuentes y PDFs de pagos. |
| Por qué | Establecer la base funcional de persistencia local, avisos operativos y exportación. |
| Archivos | `lib/demo-store.ts`, `lib/draft-store.ts`, `lib/alerts.ts`, `lib/source-extraction.ts`, `lib/source-validation.ts`, `components/alert-center.tsx`, `components/payment-pdf.tsx`, `tests/regression.test.mjs` y archivos relacionados del commit. |
| Verificación | Baseline conservado en el historial Git; pruebas de regresión incluidas en el commit. |
| Despliegue | Referencia de baseline para comparar y recuperar; no sustituye la verificación del despliegue actual. |
| Rollback | Usar `f76af2c` como último conocido bueno si el despliegue posterior no es recuperable; seguir `docs/ROLLBACK.md`. |

### 2026-09-22 — documentación y control de calidad

| Campo | Detalle |
|---|---|
| Cambio | Contexto del proyecto, historial durable, procedimiento de rollback, changelog, índice documental y workflow de calidad. |
| Por qué | Hacer trazables los cambios y bloquear releases que no pasen las comprobaciones existentes. |
| Archivos | `docs/PROJECT-CONTEXT.md`, `docs/PROJECT-LOG.md`, `docs/ROLLBACK.md`, `docs/README.md`, `CHANGELOG.md`, `.github/workflows/quality.yml`. |
| Verificación | Pendiente de ejecutar en este cambio: YAML estructural, `npm ci`, build, tipos y tests cuando el entorno lo permita. |
| Despliegue | No desplegado; este cambio no modifica comportamiento de aplicación. |
| Rollback | Revertir el commit de documentación/workflow; el procedimiento completo está en `docs/ROLLBACK.md`. |
