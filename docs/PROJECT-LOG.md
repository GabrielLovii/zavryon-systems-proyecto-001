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

### 2026-09-24 — fix: la app no respondía (CSP), PDFs y worker de pdf.js

| Campo | Detalle |
|---|---|
| Cambio | CSP con `script-src 'unsafe-inline'` (Next.js App Router usa scripts inline), `style-src`, `connect-src` a Supabase y `worker-src`; worker de pdf.js servido desde `public/`; ventanas de PDF de pagos/proveedores ya no usan `noopener` (devolvía `null`) y el de proveedor imprime sin esperar `load`. |
| Por qué | El CSP `default-src 'self'` bloqueaba la hidratación: la página se veía pero no se podía usar. Extracción de PDF y exportación de PDFs también fallaban. |
| Archivos | `next.config.mjs`, `lib/pdf-extractor.ts`, `components/payment-pdf.tsx`, `components/supplier-pdf.tsx`, `package.json`, `.gitignore`. |
| Verificación | `npm ci`, `npm run build`, `npx tsc --noEmit`, `npm test` (10/10) y headers verificados con `next start`. |
| Despliegue | Vercel desde `main`. |
| Rollback | Revertir este commit según `docs/ROLLBACK.md`. |

### 2026-09-24 — feat: abastecimiento, flujo de pedidos, nube y 60 mejoras

| Campo | Detalle |
|---|---|
| Cambio | Módulo Abastecimiento (stock por categoría, movimientos, faltantes, por pedir, temporada), flujo de pedidos con WhatsApp, caja en pagos, guardado en la nube (Supabase), extractor de fuentes v2, rediseño responsive, logo e íconos PWA. Lista completa en `docs/MEJORAS-60.md`. |
| Por qué | Pedidos del cliente y errores detectados en la revisión (ver MEJORAS-60). |
| Archivos | `components/*`, `lib/{stock,order-flow,seasonal,cloud-sync,catalog-parse,source-extraction,pdf-extractor,format}.ts`, `app/*`, `public/*`, `tests/*`, migración Supabase `app_state_cloud_sync`. |
| Verificación | `npm run build`, `tsc`, `next lint` sin avisos, `npm test` 41/41, flujo E2E en navegador (13/13, sin errores JS), 14 pantallas sin desborde a 390 px, login contra Supabase. |
| Despliegue | Rama `feat/mejoras-abastecimiento` (preview de Vercel). Requiere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel para la nube. |
| Rollback | Revertir el merge; la migración es aditiva (tablas nuevas) y no afecta datos existentes. |

### 2026-09-24 — fix: variables de Supabase sin prefijo público

| Campo | Detalle |
|---|---|
| Cambio | La app lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; `next.config.mjs` las incorpora al build. Los nombres `NEXT_PUBLIC_*` quedan como respaldo. |
| Por qué | Vercel bloqueaba/advertía al guardar variables con prefijo `NEXT_PUBLIC_`. La clave publicable sigue siendo pública por diseño (RLS protege los datos). |
| Archivos | `next.config.mjs`, `lib/supabase.ts`, `app/api/supabase-health/route.ts`, `.env.example`, docs. |
| Verificación | Build con la variable sin prefijo incorpora la clave; `npm test` 41/41. |
| Rollback | Revertir el commit y volver a cargar las variables `NEXT_PUBLIC_*`. |

### 2026-09-25 — fix + feat: montos en pesos, CSV para Excel y "marcar todos"

| Campo | Detalle |
|---|---|
| Cambio | Campos de montos y cantidades (`components/number-field.tsx`): al borrar no aparece 0, aceptan notación argentina ("1.500", "12,50") y aplican el mínimo al salir del campo. CSV con `;` y coma decimal (`toCsv`). Stock: "Marcar todos" (con filtros) y casilla por categoría con estado parcial. |
| Por qué | Pedido del propietario: el 0 aparecía al borrar un monto; la app trabaja en pesos argentinos; marcar todos los productos. |
| Archivos | `components/{number-field,supply,dashboard,barcode,order-editor,new-order,quick-create,seasonal-panel}.tsx`, `lib/format.ts`, `tests/format.test.mjs`. |
| Verificación | `tsc`, `next lint`, `npm test` 59/59, `next build`; E2E montos/marcar todos/CSV 13/13, reanudación 10/10, comodidad 18/18, flujos 13 + 17 + 9; sin errores JS. |
| Rollback | Revertir los dos commits de esta entrada. |

### 2026-09-25 — fix + feat: datos que no se pisan, tablet, pausa/retomar y 100 mejoras

| Campo | Detalle |
|---|---|
| Cambio | Corrige la pérdida de datos al recargar (la demo pisaba lo guardado). Cada pantalla vuelve como quedó (filtros, búsquedas, selección, formularios a medio cargar, scroll, última sección). En segundo plano no corre nada (cámara, sondeo de nube) y lo pendiente se sube a la nube al pausar. Tablet: tablas como tarjetas, toques de 44 px, menú deslizable, pantalla encendida al recibir/escanear. Detalle en `docs/MEJORAS-100.md`. |
| Por qué | Pedido del propietario: usar la app en tablet, pausar y retomar sin perder nada, y guardar en la nube al iniciar sesión. |
| Archivos | `lib/{ui-state,device,demo-store,cloud-sync}.ts`, `app/{page.tsx,globals.css}`, `components/{dashboard,supply,barcode,sidebar,settings,search-field,order-editor,seasonal-panel,alert-center,new-order}.tsx`, `public/manifest.webmanifest`, `tests/ui-state.test.mjs`. |
| Verificación | `tsc`, `next lint`, `npm test` 53/53, `next build`. E2E: reanudación 9/9 en 820×1180, 1180×820 y 390×844; comodidad táctil 18/18; flujos previos 13 + 17 + 9; sin desborde horizontal en las 18 secciones en los tres tamaños; sin errores JS. |
| Despliegue | Vercel producción desde `main` `a42a52a`: estado success; https://zavryon-systems-proyecto-001.vercel.app responde 200; E2E contra producción en tablet: reanudación 10/10 y comodidad 18/18 sin errores JS. Revisión Gentle AI aprobada (lineage review-51d3c4cc1f90551b); observaciones corregidas en `a42a52a`. |
| Rollback | Revertir `41dbdc3..a42a52a` en `main` (ver `git log`) y recuperar en Vercel el deployment anterior. |

### 2026-09-25 — feat: pedidos, recepción, códigos de barras y combos

| Campo | Detalle |
|---|---|
| Cambio | Mejoras 61–73 de `docs/MEJORAS-60.md`: alta rápida de productos/proveedores, recepción por lista, lectora de códigos (HID, cámara, foto), catálogo por vistas, historial por categoría, calendario y combos. |
| Archivos | `components/{quick-create,barcode,order-editor,seasonal-panel,supply,dashboard,new-order,order-pdf}.tsx`, `lib/{barcode,seasonal,catalog-parse,source-extraction,stock}.ts`, `app/globals.css`, `next.config.mjs` (cámara permitida), tests. |
| Verificación | `tsc`, `next lint`, `npm test` 48/48, flujos E2E en navegador (13 + 17 + 9 controles) sin errores JS, 390 px sin desborde. La lectura por foto/cámara requiere navegador con BarcodeDetector (Chrome/Edge Android). |
| Rollback | Revertir el merge de `feat/pedidos-recepcion`. |
