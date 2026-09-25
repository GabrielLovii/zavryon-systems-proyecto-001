# Historial de versiones

Resumen corto; consultar [`docs/PROJECT-LOG.md`](docs/PROJECT-LOG.md) para el detalle operativo y las referencias de rollback.

## 2026-09-25

- **fix** — Montos: al borrar ya no aparece un 0; se aceptan "1.500" y "12,50". CSV con punto y coma y coma decimal para Excel en español (Argentina).
- **feat** — Stock: "Marcar todos" (respeta búsqueda y filtros) y casilla por categoría.

- **fix** — Recargar ya no reemplaza los datos guardados por la demo.
- **feat** — Tablet, pausar y retomar donde lo dejaste, y 100 mejoras de uso ([`docs/MEJORAS-100.md`](docs/MEJORAS-100.md)).

- **feat/pedidos-recepcion** — Alta rápida de productos y proveedores, recepción por lista, lectora de códigos de barras, catálogo por categoría/proveedor/código, calendario comercial y combos.

## 2026-09-24

- **feat/mejoras-abastecimiento** — Abastecimiento, flujo de pedidos con WhatsApp, cajas en pagos, nube Supabase, fuentes v2 y 60 mejoras ([`docs/MEJORAS-60.md`](docs/MEJORAS-60.md)).
- **f247b08** — Fix: la app no respondía (CSP bloqueaba la hidratación) y PDFs.

## 2026-09-22

- **f92fac5e** — Edición de pedidos y shell responsive; despliegue verificado.
- **f76af2c** — Autosave/recuperación, alertas, extracción segura de fuentes y PDFs de pagos.
- **Documentación** — Contexto, historial durable, rollback seguro, índice y workflow de calidad.
