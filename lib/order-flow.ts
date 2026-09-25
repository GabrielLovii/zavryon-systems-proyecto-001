import type { Order, OrderEvent, OrderStatus, Product, Supplier, SupplierProduct } from './mock-data';

/** The four stages the business follows: prepared → sent to supplier → confirmed (in progress) → received. */
export type OrderStage = 'preparado' | 'enviado' | 'en-curso' | 'en-recepcion' | 'recibido' | 'cancelado';

export const stageLabels: Record<OrderStage, string> = { preparado: 'Preparado', enviado: 'Enviado', 'en-curso': 'En curso', 'en-recepcion': 'En recepción', recibido: 'Recibido', cancelado: 'Cancelado' };
export const stageBadge: Record<OrderStage, string> = { preparado: 'badge-muted', enviado: 'badge-amber', 'en-curso': 'badge-amber', 'en-recepcion': 'badge-amber', recibido: 'badge-green', cancelado: 'badge-red' };
export const timelineStages: OrderStage[] = ['preparado', 'enviado', 'en-curso', 'recibido'];

/** Maps every stored status (including legacy ones) to a workflow stage. */
export function orderStage(status: OrderStatus): OrderStage {
  switch (status) {
    case 'Borrador':
    case 'Preparado': return 'preparado';
    case 'Enviado': return 'enviado';
    case 'Confirmado':
    case 'En curso':
    case 'Esperando entrega': return 'en-curso';
    case 'En recepción': return 'en-recepcion';
    case 'Cancelado': return 'cancelado';
    default: return 'recibido';
  }
}

export const isOrderOpen = (order: Pick<Order, 'status'>) => !['recibido', 'cancelado'].includes(orderStage(order.status));
export const canConfirm = (order: Pick<Order, 'status'>) => ['preparado', 'enviado'].includes(orderStage(order.status));
export const canCancel = (order: Pick<Order, 'status'>) => ['preparado', 'enviado', 'en-curso'].includes(orderStage(order.status));

/** Returns a copy of the order with the new status and an audit event appended. */
export function withStatus(order: Order, status: OrderStatus, by: string, note?: string, at = new Date().toISOString()): Order {
  const event: OrderEvent = { status, at, by, ...(note ? { note } : {}) };
  return { ...order, status, events: [...(order.events || []), event] };
}

/** When the order reached a stage, from its audit events (the last matching event wins). */
export function stageDate(order: Order, stage: OrderStage) {
  return [...(order.events || [])].reverse().find((event) => orderStage(event.status) === stage)?.at;
}

const moneyText = (value: number) => `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}`;

/** Plain-text order summary to send to the supplier (WhatsApp, e-mail, share sheet). */
export function orderMessage(order: Order, context: { clientName: string; supplier?: Supplier; products: Product[]; supplierProducts: SupplierProduct[]; includePrices?: boolean }) {
  const greeting = context.supplier?.contact ? `Hola ${context.supplier.contact.split(' ')[0]}` : 'Hola';
  const lines = order.lines.map((line) => {
    const product = context.products.find((item) => item.id === line.productId);
    const offer = context.supplierProducts.find((item) => item.productId === line.productId && item.supplierId === order.supplierId);
    const presentation = offer?.presentation || product?.unit;
    const code = offer?.externalCode ? ` [${offer.externalCode}]` : '';
    const price = context.includePrices ? ` — ${moneyText(line.price * line.quantity)}` : '';
    return `• ${line.quantity} x ${product?.name || 'Producto'}${presentation ? ` (${presentation})` : ''}${code}${price}`;
  });
  const total = order.lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const delivery = order.expectedDate ? new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${order.expectedDate}T00:00:00`)) : '';
  return [
    `${greeting}, te paso el pedido ${order.id} de ${context.clientName}:`,
    '',
    ...lines,
    '',
    ...(context.includePrices ? [`Total estimado: ${moneyText(total)}`] : []),
    ...(delivery ? [`Entrega solicitada: ${delivery}`] : []),
    ...(order.notes ? [`Notas: ${order.notes}`] : []),
    '',
    '¿Me confirmás disponibilidad y fecha de entrega? ¡Gracias!',
  ].join('\n');
}

/**
 * Normalizes a phone for wa.me (digits only, international format).
 * Argentine numbers without country code get 54 + 9 (mobile) prefixed; a leading 0 and the "15" mobile prefix are dropped.
 */
export function whatsappPhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('54')) return digits.startsWith('549') ? digits : `549${digits.slice(2)}`;
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 12 && digits.slice(2, 4) === '15') digits = digits.slice(0, 2) + digits.slice(4);
  return digits.length >= 10 ? `549${digits}` : digits;
}

export function whatsappUrl(phone: string, text: string) {
  const number = whatsappPhone(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
