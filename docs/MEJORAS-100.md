# 100 mejoras de uso (2026-09-25)

Continúa [`MEJORAS-60.md`](MEJORAS-60.md). Rama `feat/pedidos-recepcion`. Foco: tablet, pausar y retomar sin perder nada, comodidad de uso.

## Errores corregidos

| # | Mejora | Detalle |
|---:|---|---|
| 1 | Recargar borraba los datos propios | Las pantallas guardaban la demo antes de que la app leyera lo guardado en el dispositivo; ahora no se guarda nada hasta terminar de cargar. |
| 2 | Se veían números de la demo al abrir | Mientras se leen los datos se muestra "Cargando tus datos…" en vez de la demo. |
| 3 | El escáner abría el teclado de la tablet | El campo de código ya no toma el foco solo ni lo recupera tras cada lectura en pantallas táctiles. |

## Seguir donde lo dejaste

Todo se guarda en el dispositivo (`lib/ui-state.ts`) y vuelve igual al recargar, al reabrir la app o cuando la tablet cierra la pestaña.

| # | Mejora | Detalle |
|---:|---|---|
| 4 | Última pantalla | Abrir la app instalada sin enlace vuelve a la última sección usada. |
| 5 | Scroll por pantalla | Cada sección recuerda hasta dónde bajaste. |
| 6 | Scroll al pausar | Se guarda al cambiar de app, apagar la pantalla o cerrar. |
| 7 | Scroll al navegar | Se guarda al cambiar de sección desde el menú. |
| 8 | Pedidos: etapa | El filtro (Preparado, Enviado…) se conserva. |
| 9 | Pedidos: búsqueda | El texto buscado se conserva. |
| 10 | Pedidos: detalle | El detalle abierto sigue abierto. |
| 11 | Pedidos: edición | El panel de edición y los cambios sin guardar se conservan. |
| 12 | Recepción: filtro | Hoy / semana / pendientes / recibidas se conserva. |
| 13 | Recepción en curso | El pedido que estabas recibiendo sigue abierto. |
| 14 | Proveedores: búsqueda | Se conserva. |
| 15 | Proveedores: formulario | El proveedor a medio cargar se conserva. |
| 16 | Catálogo: búsqueda | Se conserva. |
| 17 | Catálogo: vista | Por categoría, proveedor o código se conserva. |
| 18 | Catálogo: formulario | El producto a medio cargar, con proveedor y precio, se conserva. |
| 19 | Usuarios: formulario | El usuario a medio cargar se conserva. |
| 20 | Pagos: filtros | Proveedor, estado y caja se conservan. |
| 21 | Pagos: formulario | El pago a medio cargar se conserva. |
| 22 | Historial | Tipo, búsqueda y vista se conservan. |
| 23 | Abastecimiento: pestaña | Stock, Faltantes, Por pedir, Temporada o Movimientos se conserva. |
| 24 | Abastecimiento: filtros | Búsqueda, categoría y estado se conservan. |
| 25 | Abastecimiento: selección | Los productos tildados para pedir se conservan. |
| 26 | Ajuste de stock abierto | El producto que estabas ajustando sigue abierto. |
| 27 | Ajuste de stock: lo escrito | Tipo, cantidad y motivo se conservan hasta guardar o cancelar. |
| 28 | Movimientos: filtros | Producto y tipo se conservan. |
| 29 | Códigos de barras | Búsqueda, margen, redondeo y "solo sin código" se conservan. |
| 30 | Temporada | Margen de combos y días de cobro se conservan. |
| 31 | Agenda | El filtro por tipo se conserva. |
| 32 | Aviso al retomar | "Seguís donde lo dejaste" cuando se recupera un formulario o una recepción. |
| 33 | Suspender y reanudar | Al congelar/reanudar la pestaña (tablet dormida) todo sigue igual. |
| 34 | Estado validado | Si lo guardado está dañado o no corresponde, se usa el valor por defecto. |
| 35 | Reinicio limpio | Borrar datos o restaurar la demo también limpia las pantallas guardadas. |

## Pausa sin trabajo en segundo plano

| # | Mejora | Detalle |
|---:|---|---|
| 36 | Cámara | Se apaga sola si la app pasa a segundo plano. |
| 37 | Nube en pausa | No consulta la nube mientras la app está oculta. |
| 38 | Nube al pausar | Los cambios pendientes se suben al instante antes de pausar. |
| 39 | Pantalla encendida en recepción | La tablet no se apaga mientras recibís; se libera al terminar o pausar. |
| 40 | Pantalla encendida al escanear | Igual en Códigos de barras. |
| 41 | Datos protegidos | Se pide al navegador que no borre los datos locales si falta espacio. |
| 42 | Estado de la protección | Configuración muestra si el navegador protege los datos. |

## Tablet y pantallas táctiles

| # | Mejora | Detalle |
|---:|---|---|
| 43 | Tablas como tarjetas | Si una tabla no entra, cada fila se muestra como tarjeta con etiquetas. |
| 44 | Pedidos en tablet horizontal | Sin scroll lateral; acciones en una fila. |
| 45 | Catálogo en tablet vertical | El botón de editar ya no queda cortado. |
| 46 | Toques de 44 px | Botones, campos, chips e íconos en pantallas táctiles. |
| 47 | Sin zoom al escribir | Campos con texto de 16 px en táctil (iPad/iPhone). |
| 48 | Casillas más grandes | Para tildar con el dedo. |
| 49 | Pestañas más altas | En táctil. |
| 50 | Botones +/− más grandes | En el stock. |
| 51 | Menú más cómodo | Ítems más altos en táctil. |
| 52 | Abrir menú deslizando | Desde el borde izquierdo. |
| 53 | Cerrar menú deslizando | Hacia la izquierda. |
| 54 | Menú muestra dónde estás | Al abrirse, la sección actual queda a la vista. |
| 55 | Menú proporcionado | Nunca ocupa más del 85 % del ancho. |
| 56 | Áreas seguras: encabezado | No queda bajo la cámara o la barra de estado. |
| 57 | Áreas seguras: menú y avisos | Respetan la barra inferior del sistema. |
| 58 | Toques inmediatos | Sin la demora de doble toque. |
| 59 | Sin destello gris | Al tocar botones. |
| 60 | Sin recarga accidental | Tirar la lista hacia abajo no recarga la página. |
| 61 | Botones con respuesta | Se "hunden" al presionarlos. |
| 62 | Sin resaltado pegado | Las filas no quedan marcadas tras tocarlas. |
| 63 | Teclado numérico | En todos los campos de números. |
| 64 | Reemplazar números fácil | Tocar un número selecciona su valor. |
| 65 | Rueda del mouse segura | Ya no cambia cantidades por accidente. |
| 66 | Fondo quieto | La página no se desplaza con un diálogo abierto. |
| 67 | Vibración al leer | Confirmación al leer un código. |
| 68 | Vibración de error | Patrón distinto si el código no es del pedido. |
| 69 | Resumen de stock sin huecos | La tarjeta impar ocupa toda la fila. |
| 70 | Resumen de pagos | En tres columnas desde tablet. |
| 71 | Conexión siempre visible | El ícono aparece también en celular y tablet vertical. |
| 72 | Instalar en tablet | Configuración lo explica para celular y tablet. |
| 73 | Reabrir la app | Usa la ventana ya abierta en lugar de otra. |
| 74 | Pantalla completa | Preferencia de ventana de app al instalar. |
| 75 | "Ir" en el teclado | Al cargar un código a mano. |

## Búsqueda y teclado

| # | Mejora | Detalle |
|---:|---|---|
| 76 | Buscador unificado | Stock, Códigos, Pedidos, Proveedores, Catálogo e Historial. |
| 77 | Botón limpiar | × para borrar la búsqueda. |
| 78 | Escape limpia | Borra la búsqueda con el teclado. |
| 79 | Enter cierra el teclado | Para ver los resultados en la tablet. |
| 80 | Sin sugerencias encima | Sin autocompletar ni corrector sobre los resultados. |
| 81 | Atajo "/" | Lleva al buscador de la pantalla. |
| 82 | Escape cierra diálogos | Cámara, ajuste de stock y confirmaciones de Configuración. |
| 83 | Textos de búsqueda claros | Proveedores indica qué se puede buscar. |
| 84 | Buscadores más anchos | Pedidos, Proveedores e Historial. |

## Visual y avisos

| # | Mejora | Detalle |
|---:|---|---|
| 85 | Transición entre secciones | Aparición suave. |
| 86 | Diálogos suaves | Diálogos y panel de pedido aparecen con fundido. |
| 87 | Errores en rojo | Avisos de error con color e ícono propios. |
| 88 | Conexión restablecida | Aviso al volver a tener internet. |
| 89 | Versión nueva | Aviso con botón "Actualizar" tras un despliegue. |
| 90 | Volver arriba | Botón flotante en pantallas largas. |
| 91 | Alertas en la pestaña | El título muestra la cantidad de alertas. |
| 92 | Alertas en el ícono | Número en el ícono de la app instalada. |
| 93 | Aviso de nube sin tapar | Deja espacio al final para no cubrir contenido. |
| 94 | Sin botón repetido | "Nuevo pedido" del encabezado se oculta en su propia pantalla. |
| 95 | Números alineados | Montos y cantidades con cifras del mismo ancho. |
| 96 | Selección con color de marca | Al seleccionar texto. |
| 97 | Barras de desplazamiento finas | Oscuras, acordes al tema. |
| 98 | Menú legible | Títulos de grupo más grandes y con más contraste. |
| 99 | Contadores legibles | Números del menú más grandes. |
| 100 | Anclas visibles | Al saltar a un elemento no queda debajo del encabezado fijo. |

## Verificación

- `npm test` (incluye `tests/ui-state.test.mjs`), `npm run lint`, `npm run build`.
- E2E en tablet vertical 820×1180, horizontal 1180×820 y celular 390×844: recarga, reapertura, congelar/reanudar, formularios a medio cargar, scroll, sin desborde horizontal, sin errores de JavaScript; flujos previos 1, 2 y 3 completos.
