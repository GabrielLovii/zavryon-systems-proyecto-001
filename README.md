# Control de Abastecimiento

MVP ejecutable de ZAVRYON SYSTEMS para Control de Abastecimiento: pedidos, recepciones, pagos, proveedores llegados, diferencias, vencimientos, proveedores, catalogo, agenda e historial.

## Requisitos

- Node.js 18.17 o superior
- npm

## Ejecutar

```bash
npm.cmd install
npm.cmd run dev
```

Abrir `http://localhost:3000`.

La aplicación integra `1.jpg` como `public/logo-scpr.jpg` porque su fondo negro y azul eléctrico son compatibles con el tema oscuro actual. El recurso se usa sin conversión en la cabecera, iconos de aplicación y cabecera del PDF imprimible.

## Verificacion

```bash
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit
```

Para la comprobación manual exacta:

1. Abrir `Usuarios` y comprobar que aparecen exactamente Gabriel López, Gabriel Gauto, Facundo Chamorro y Martin Ruiz Dias. Agregar, editar, activar/desactivar y eliminar; la aplicación bloquea eliminar/desactivar el último usuario activo.
2. Abrir `Nuevo pedido`, seleccionar proveedor y responsable, buscar productos por nombre, SKU, marca, categoría o código externo y agregarlos desde los resultados. Verificar que repetir un producto aumenta su cantidad sin duplicar la línea; editar cantidad/precio o quitar líneas y comprobar el subtotal/total. En `Recepcion`, seleccionar proveedor, después pedido, cambiar una línea a `Llegó`, informar cantidad, lote, activar `Controlar vencimiento`, elegir fecha y pulsar `Guardar estado`.
3. Volver a abrir el pedido y comprobar que estado, cantidad, nota, lote y vencimiento se conservaron. Pulsar `Guardar recepción completa`; `Proveedores llegados` debe mostrar una sola llegada y `Vencimientos` el lote.
4. Abrir `Fuentes`, registrar una URL pública o PDF menor a 10 MB. Pulsar `Revisar / extraer`. Las URL se consultan por `/api/source-preview`, que bloquea localhost, IPs privadas, esquemas no HTTP(S), redirecciones privadas y respuestas mayores a 5 MB. Editar candidatos, marcar `Aprobado` y pulsar `Confirmar aprobados`.
5. Comprobar que el catálogo actualiza o crea productos sin duplicar por SKU/nombre y conserva proveedor y fuente. Si no se puede leer el sitio o el PDF no contiene texto extraíble, se muestra el error y se permite agregar candidatos manualmente; no se simula OCR.
6. Recargar para verificar `localStorage` versionado v5. `Restaurar demo` devuelve también usuarios, fuentes, candidatos y usuario activo al estado inicial.
7. En `Pedidos`, pulsar `Exportar PDF` en la fila del pedido elegido. Se abre el detalle imprimible del pedido correcto; en la ventana del navegador elegir `Guardar como PDF`.
8. En `Notificaciones`, comprobar que cada vencimiento genera reglas a 3, 2, 1 días y el día de vencimiento, y que los pedidos abiertos generan reglas a 1 día y el mismo día. `Cargar alertas demo próximas` deja un vencimiento y una entrega en `2026-09-22` para probarlas desde la fecha de referencia `2026-09-21`.
9. En `Agenda`, usar filtros de tipo/estado y `Exportar .ics`. El archivo incluye eventos y `VALARM`; el usuario debe importarlo o abrirlo manualmente en Google Calendar/Outlook. En `Notificaciones`, activar preferencias y el permiso del navegador solo con el botón explícito.

## Alcance del MVP

- Dashboard operativo responsive, pensado para uso en tablet.
- Sidebar responsive con acceso funcional a Pedidos, Recepcion, Proveedores llegados, Economía, Pagos, Vencimientos, Proveedores, Catalogo, Fuentes, Agenda e Historial.
- Pedidos recientes con estados operativos y alertas accionables.
- Actividad reciente / historial de movimientos.
- Datos de demostracion aislados en `lib/mock-data.ts`, listos para reemplazarse por una API.
- Pagos tipados y persistidos con `localStorage` versionado v5; el campo `cancelled` conserva trazabilidad al anular y la sesión activa queda restaurable.
- Totales diarios, semanales y mensuales presentados en la vista económica; esta demo usa el mismo conjunto local para los tres períodos.
- Catálogo con búsqueda, alta/edición y asociación producto-proveedor; Fuentes conserva metadata local de PDF/URL y estados de revisión; Vencimientos permite filtrar alertas de 3 días y editar lote/fecha; Agenda e Historial reúnen los flujos y permiten exportar historial CSV.
- Cada pedido se puede exportar desde su fila como un informe detallado de impresión con productos, recepción, diferencias, lotes, pagos y datos disponibles. La vista oculta controles y navegación al imprimir.
- Las alertas son locales y deterministas: vencimientos a 3/2/1/0 días; entregas a 1/0 días, excluyendo pedidos `Cerrado` y `Cancelado`. Se persisten en store v5 con estados programada, activa, leída o descartada, claves únicas por fuente/regla/fecha y preferencias de navegador.
- No hay envío real de email, WhatsApp ni push de servidor. Un backend futuro deberá generar jobs y entregar notificaciones desde una API o worker.

## Estructura

- `app/`: entrada Next.js y estilos globales.
- `components/`: layout de navegacion y dashboard.
- `lib/mock-data.ts`: mock data separada de la presentacion.
- `lib/demo-store.ts`: estado y persistencia local versionada de la demo (v5), preparado para reemplazarse por un adaptador API.
- `docs/MEJORAS-50.md`: backlog priorizado de capacidades.

## Alcance de fuentes

Los PDF se validan y conservan como metadata de revisión en el navegador. Se intenta leer texto embebido con `File.text()` cuando el archivo sigue disponible en la sesión, pero no hay OCR productivo ni dependencia PDF. Las URL se consultan mediante el endpoint seguro local y requieren revisión humana; CORS del sitio no es una barrera para ese endpoint, pero autenticación, bloqueos del sitio, tipo no soportado o límite de tamaño producen error. Los candidatos deben editarse y aprobarse antes de importarse al catálogo.
