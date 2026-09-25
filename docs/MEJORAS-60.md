# 60 mejoras (2026-09-24)

Continúa [`MEJORAS-50.md`](MEJORAS-50.md). Rama `feat/mejoras-abastecimiento`.

## Errores corregidos

| # | Mejora | Detalle |
|---:|---|---|
| 1 | Colores cian rotos | `tailwind.config.ts` pisaba la paleta `cyan`; ninguna clase `cyan-300` existía. |
| 2 | PDF de pedido salía en blanco | El CSS de impresión ocultaba el contenedor raíz de Next.js. |
| 3 | "Restaurar demo" inaccesible | Un efecto borraba el botón del DOM; ahora está en Configuración. |
| 4 | Doble encabezado y fecha fija | Se unificó el encabezado; se quitó "21 de septiembre" hardcodeado. |
| 5 | Menú lateral desaparecía en escritorio | Se cerraba al navegar en cualquier tamaño. |
| 6 | Botón ☰ tapaba el menú | Ahora vive en el encabezado, solo en móvil. |
| 7 | Desborde horizontal en celular | Grillas con `min-w-0`; verificado a 390 px en todas las pantallas. |
| 8 | Alertas de Inicio eran de muestra | Ahora son las alertas reales activas. |
| 9 | "Pedidos abiertos" contaba cerrados | Usa el flujo de estados. |
| 10 | IDs de pedido repetibles | `PED-` secuencial por máximo existente. |
| 11 | IDs de pago repetibles | `PAG-` secuencial por máximo existente. |
| 12 | Nuevo pedido sin avisos | Se conectó el toast. |
| 13 | Recepción perdía lo tipeado | El borrador se reiniciaba con cualquier cambio de estado. |
| 14 | Recibir no sumaba stock | Ahora suma una sola vez (idempotente) y registra el movimiento. |
| 15 | Moneda con formato colombiano | `es-AR` en toda la app y PDFs. |
| 16 | CSV con acentos rotos en Excel | BOM UTF-8 y liberación del blob. |
| 17 | Números inválidos (NaN) | Campos numéricos con límites. |
| 18 | Service worker cacheaba API y terceros | Solo cachea assets propios. |
| 19 | PDF por URL nunca se procesaba | El servidor devuelve el PDF y se extrae en el navegador. |
| 20 | PDF: una página = un producto | Se reconstruyen líneas y columnas por posición. |
| 21 | Precios sin `$` ignorados | Parser AR/internacional (`1.234,56`, `1,234.56`). |
| 22 | Tablas: se perdía la 1.ª fila y el nombre era siempre la 1.ª columna | Mapeo por encabezado (código, descripción, marca, precio…). |
| 23 | HTML con salto inicial y texto plano rechazados | Validación de firma tolerante a espacios/BOM. |
| 24 | Alertas repetidas por lote | Se muestra solo la más reciente por registro. |
| 25 | Estado "Supabase: demo local" engañoso | Reemplazado por el estado real de la nube. |
| 26 | Interruptores de alertas | Soportan preferencias nuevas sin romper datos viejos. |

## Funcionalidades

| # | Mejora |
|---:|---|
| 27 | **Abastecimiento**: stock agrupado por categoría con estado Faltante / Poco / Bajo / OK. |
| 28 | Ajuste rápido ±1 y registro de conteo, entrada, salida o "se terminó" con motivo. |
| 29 | Registro de movimientos de stock con usuario, filtros y CSV. |
| 30 | Faltantes con cantidad sugerida y proveedor más barato. |
| 31 | Lista Por pedir → un pedido por proveedor con un clic. |
| 32 | Alta rápida de mercadería con categoría, mínimo y proveedor. |
| 33 | Alertas automáticas de stock bajo (activables). |
| 34 | Resumen de stock y valor inventariado. |
| 35 | Flujo de pedido Preparado → Enviado → En curso → Recibido, con historial. |
| 36 | Envío del pedido por WhatsApp con mensaje armado. |
| 37 | Compartir/copiar pedido (share sheet del celular). |
| 38 | Pedidos: filtros por estado, búsqueda, confirmar, recibir y cancelar. |
| 39 | Editor de pedidos integrado en Pedidos. |
| 40 | Nuevo pedido: sugerencias de stock bajo del proveedor y notas. |
| 41 | Recepción: "Todo llegó completo", pedido preseleccionado, validación de vencimientos. |
| 42 | Pagos: caja (Caja 1, Caja 2, Caja Alejandro, Caja Delivery), filtro y totales por caja. |
| 43 | Pagos: PDF en cada fila, formulario completo y anulación sin borrar. |
| 44 | Economía por proveedor y por caja. |
| 45 | Historial unificado (pedidos, recepciones, pagos, stock, fuentes) con búsqueda. |
| 46 | Recomendaciones de temporada y fechas comerciales argentinas + rotación propia. |
| 47 | **Guardado en la nube** (Supabase Auth + RLS), sincronización automática, offline y conflictos. |
| 48 | Historial de versiones en la nube (últimas 30) y copia de seguridad JSON. |
| 49 | Datos del negocio editables. |
| 50 | Proveedores: alta con formulario, duplicados y teléfono clickeable. |
| 51 | Catálogo: SKU único, estado de stock, imagen y categorías sugeridas. |
| 52 | Fuentes: JSON-LD, microdatos, imágenes, JSON, CSV, aprobación masiva y código interno automático. |
| 53 | Menú agrupado, con tildes y contadores de pendientes. |
| 54 | La sección vive en la URL (recargar y "atrás" funcionan) + accesos directos PWA. |
| 55 | Logo simplificado legible en tamaño chico e íconos PWA 192/512/maskable. |
| 56 | Pedidos, pagos e inicio en tarjetas en el celular. |
| 57 | Accesibilidad: saltar al contenido, etiquetas, foco, toques de 40 px, avisos cerrables. |
| 58 | Aviso de trabajo sin conexión. |
| 59 | Título de pestaña por sección. |
| 60 | 41 tests automáticos (PDF real, extractor, stock, pedidos, nube) y CI en Node 22. |

## Segunda tanda (2026-09-25)

| # | Mejora |
|---:|---|
| 61 | Crear producto (con precio y código interno) y proveedor desde Nuevo pedido, Editar pedido, Abastecimiento y Fuentes. |
| 62 | Editar pedido muestra solo los productos del proveedor; cada edición queda en el historial. |
| 63 | Recepción: lista de hoy / semana / pendientes / recibidas; se toca una para ver estado, recibir, corregir o exportar PDF. |
| 64 | Códigos de barras: lectoras USB, USB‑C y Bluetooth (modo teclado), cámara y foto; validación EAN/UPC. |
| 65 | Escaneo en recepción (+1 por lectura) y asignación de códigos desconocidos. |
| 66 | Lista de precios CSV con código de barras, costo, margen y precio de venta. |
| 67 | PDF del pedido con código interno, EAN y código del proveedor. |
| 68 | Catálogo agrupado por categoría, proveedor o código; búsqueda por código de proveedor. |
| 69 | Historial agrupado por categoría (o todo junto). |
| 70 | Calendario comercial de 90 días (feriados, fechas comerciales, Misiones, cobros). |
| 71 | Combos armados con productos reales: costo, precio normal, precio combo y cartel para copiar. |
| 72 | Logo nuevo en PDFs e íconos; estilos en capas de Tailwind (arregla íconos encimados en buscadores). |
| 73 | Extractor de fuentes: ignora tablas que no son de productos, números de documento y etiquetas sueltas. |
