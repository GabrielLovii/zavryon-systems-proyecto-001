# 50 mejoras y capacidades

Backlog operativo de Control de Abastecimiento. Cada fila conserva una mejora útil y explica su estado actual.

| # | Mejora | Estado | Razón |
|---:|---|---|---|
| 1 | Dashboard con métricas accionables | Implementada | Prioriza pedidos, recepción y saldo. |
| 2 | Navegación interna por módulos | Implementada | Reduce cambios de contexto. |
| 3 | Acciones rápidas desde alertas | Implementada | Lleva al flujo operativo. |
| 4 | Creación guiada de pedido | Implementada | Evita omisiones básicas. |
| 5 | Estados de pedido configurables | Posponer | Requiere reglas de negocio configurables. |
| 6 | Historial auditable por pedido | Implementada | Permite reconstruir pedidos y recepciones. |
| 7 | Responsable en pedidos, recepciones y pagos | Implementada | Hace visible la responsabilidad demo. |
| 8 | Recepción agrupada por proveedor y pedido | Implementada | Ordena el trabajo de depósito. |
| 9 | Guardado explícito por línea | Implementada | Evita perder estados parciales. |
| 10 | Recepción completa idempotente | Implementada | No duplica la recepción al reabrir. |
| 11 | Estados llegó, faltante, sobrante y sustitución | Implementada | Captura diferencias operativas. |
| 12 | Cantidad esperada y recibida | Implementada | Calcula diferencias por línea. |
| 13 | Nota y lote por línea | Implementada | Conserva evidencia operativa. |
| 14 | Control de vencimiento por línea | Implementada | Publica lotes en Vencimientos. |
| 15 | Calendario de vencimiento | Implementada | Agenda unificada con reglas y exportación ICS. |
| 16 | Proveedores llegados sin duplicación | Implementada | Usa la recepción persistida como fuente. |
| 17 | Búsqueda de productos | Implementada | Encuentra nombres, SKU y marca. |
| 18 | Búsqueda de proveedores | Implementada | Acelera la consulta del directorio. |
| 19 | Categorías y unidades de compra | Implementada | Normaliza el catálogo. |
| 20 | Indicador de stock bajo | Posponer | Falta un panel de alertas editable. |
| 21 | Ficha de proveedor | Implementada | Conserva contacto y condiciones. |
| 22 | Evaluación de cumplimiento | Posponer | Necesita métricas históricas. |
| 23 | Productos sustitutos aprobados | Posponer | Requiere reglas de equivalencia. |
| 24 | Fuentes PDF por proveedor | Implementada | Guarda archivo, tamaño, fecha y procedencia. |
| 25 | Fuentes URL por proveedor | Implementada | Valida y revisa URL pública server-side. |
| 26 | Extracción honesta con revisión manual | Implementada | No afirma OCR ni inventa resultados. |
| 27 | Candidatos editables de catálogo | Implementada | Permite corregir antes de activar. |
| 28 | Confirmación con deduplicación SKU/nombre | Implementada | Actualiza o crea productos sin duplicar. |
| 29 | Importación CSV de catálogo | Posponer | Catálogos PDF/URL tienen prioridad. |
| 30 | Validación de filas importadas | Implementada | Candidatos exigen nombre y aprobación. |
| 31 | Persistencia local versionada | Implementada | Store v5 separa estado de UI y conserva usuario activo. |
| 32 | Restauración completa de datos demo | Implementada | Incluye usuarios, fuentes y candidatos. |
| 33 | Interfaces reemplazables por API | Implementada | `demo-store` concentra persistencia local. |
| 34 | Roles visibles de operación | Implementada | Administrador, Compras, Recepción y Consulta. |
| 35 | Administración de usuarios | Implementada | Alta, edición, activación y eliminación confirmada. |
| 36 | Protección del último usuario activo | Implementada | Impide dejar el demo sin acceso. |
| 37 | Autorización real server-side | Posponer | Fuera del alcance sin backend multiusuario. |
| 38 | Registro de cambios inmutable | Posponer | Requiere API y almacenamiento durable. |
| 39 | Sesiones con expiración | Posponer | Requiere autenticación real. |
| 40 | Política de mínimos privilegios | Posponer | Requiere autorización server-side. |
| 41 | Validación de entradas en API | Implementada | Endpoint URL limita protocolo, host y tamaño. |
| 42 | Feedback visible con toast | Implementada | Confirma acciones, permisos y exportaciones. |
| 43 | Estados vacíos comprensibles | Implementada | Orienta cada módulo. |
| 44 | Focus visible y teclado | Implementada | Mantiene navegación accesible. |
| 45 | Diseño responsive para tablet | Implementada | Tablas tienen scroll y controles grandes. |
| 46 | Respeto por reduced motion | Implementada | Mantiene la preferencia del sistema. |
| 47 | Indicador de conectividad | Implementada | Expone estado online/offline. |
| 48 | Reporte de diferencias por período | Posponer | Se puede derivar de recepción, falta vista dedicada. |
| 49 | Integración ERP, correo y contabilidad | Descartar | No corresponde a esta demo local. |
| 50 | Pruebas automatizadas de flujos críticos | Posponer | Siguiente paso recomendado para estabilizar API. |
