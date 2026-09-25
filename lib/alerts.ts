import type { DemoState } from './demo-store';
import type { Expiry, Order } from './mock-data';
import { getLocalDateISO, isValidLocalDateISO } from './date';
import { stockStatus, stockStatusLabels } from './stock';

export const DEMO_TODAY = '2026-09-21';
export type AlertKind = 'vencimiento' | 'entrega' | 'stock';
export type AlertStatus = 'programada' | 'activa' | 'leída' | 'descartada';
export type AlertRule = 'expiry-3' | 'expiry-2' | 'expiry-1' | 'expiry-0' | 'delivery-1' | 'delivery-0' | 'stock-low';
export type AppAlert = { id: string; key: string; kind: AlertKind; rule: AlertRule; referenceDate: string; sourceId: string; title: string; detail: string; supplierId?: string; productId?: string; lot?: string; quantity?: number; priority: 'alta' | 'media'; status: AlertStatus; createdAt: string };
export type AlertPreferences = { expiries: boolean; deliveries: boolean; stock?: boolean; browser: boolean; notifiedKeys: string[] };

const addDays = (value: string, amount: number) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + amount); return date.toISOString().slice(0, 10); };
export const daysUntil = (value: string, reference = getLocalDateISO()) => Math.round((new Date(`${value.slice(0, 10)}T00:00:00`).getTime() - new Date(`${reference}T00:00:00`).getTime()) / 86400000);

export function buildAlerts(state: Pick<DemoState, 'expiries' | 'orders' | 'suppliers' | 'products' | 'alertPreferences'>, reference = getLocalDateISO(), previous: AppAlert[] = []): AppAlert[] {
  const generated: AppAlert[] = [];
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  const add = (item: Omit<AppAlert, 'id' | 'status' | 'createdAt'>) => {
    const existing = previousByKey.get(item.key);
    generated.push({ ...item, id: existing?.id || `alert-${item.key}`, status: existing?.status || 'programada', createdAt: existing?.createdAt || new Date().toISOString() });
  };
  if (state.alertPreferences.expiries) state.expiries.forEach((expiry: Expiry) => [3, 2, 1, 0].forEach((offset) => {
    const alertDate = addDays(expiry.date, -offset); const delta = daysUntil(alertDate, reference);
    const product = state.products.find((item) => item.id === expiry.productId)?.name || 'Producto';
    const supplier = state.suppliers.find((item) => item.id === expiry.supplierId)?.name || 'Proveedor';
    add({ key: `${expiry.id}:expiry-${offset}:${alertDate}`, kind: 'vencimiento', rule: `expiry-${offset}` as AlertRule, referenceDate: alertDate, sourceId: expiry.id, title: offset === 0 ? `Vence hoy: ${product}` : `Vencimiento en ${offset} día(s): ${product}`, detail: `${supplier} · lote ${expiry.lot} · ${expiry.quantity} uds.`, supplierId: expiry.supplierId, productId: expiry.productId, lot: expiry.lot, quantity: expiry.quantity, priority: delta <= 0 ? 'alta' : 'media' });
  }));
  if (state.alertPreferences.stock !== false) state.products.filter((product) => product.active && stockStatus(product) !== 'ok').forEach((product) => {
    const status = stockStatus(product);
    add({ key: `${product.id}:stock-${status}`, kind: 'stock', rule: 'stock-low', referenceDate: reference, sourceId: product.id, title: status === 'faltante' ? `Sin stock: ${product.name}` : `Stock ${stockStatusLabels[status].toLowerCase()}: ${product.name}`, detail: `${product.category || 'Sin categoría'} · quedan ${product.stock} · mínimo ${product.minimum}`, productId: product.id, quantity: product.stock, priority: status === 'bajo' ? 'media' : 'alta' });
  });
  if (!state.alertPreferences.deliveries) return generated;
  state.orders.filter((order: Order) => !['Recibido', 'Recibido OK', 'Cerrado', 'Cancelado'].includes(order.status) && isValidLocalDateISO(order.expectedDate)).forEach((order) => [1, 0].forEach((offset) => {
    const alertDate = addDays(order.expectedDate, -offset); const supplier = state.suppliers.find((item) => item.id === order.supplierId)?.name || 'Proveedor';
    add({ key: `${order.id}:delivery-${offset}:${alertDate}`, kind: 'entrega', rule: `delivery-${offset}` as AlertRule, referenceDate: alertDate, sourceId: order.id, title: offset === 0 ? `Entrega hoy: ${order.id}` : `Entrega mañana: ${order.id}`, detail: `${supplier} · ${order.lines.length} artículo(s) · ${order.status}`, supplierId: order.supplierId, priority: daysUntil(alertDate, reference) <= 0 ? 'alta' : 'media' });
  }));
  return generated;
}

export const effectiveStatus = (alert: AppAlert, reference = getLocalDateISO()): AlertStatus => alert.status === 'leída' || alert.status === 'descartada' ? alert.status : daysUntil(alert.referenceDate, reference) <= 0 ? 'activa' : 'programada';
export const alertLabel = (alert: AppAlert, reference = getLocalDateISO()) => effectiveStatus(alert, reference);
export function calendarIcs(alerts: AppAlert[], reference = getLocalDateISO()) {
  const active = alerts.filter((alert) => effectiveStatus(alert, reference) !== 'descartada');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZAVRYON SYSTEMS//Alertas locales//ES', 'CALSCALE:GREGORIAN'];
  active.forEach((alert) => { const stamp = alert.referenceDate.replaceAll('-', ''); const uid = `${alert.id}@zavryon.local`; lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${reference.replaceAll('-', '')}T090000Z`, `DTSTART;VALUE=DATE:${stamp}`, `SUMMARY:${alert.title}`, `DESCRIPTION:${alert.detail.replaceAll('\n', ' ')}`, 'BEGIN:VALARM', 'TRIGGER:-P0D', 'ACTION:DISPLAY', `DESCRIPTION:${alert.title}`, 'END:VALARM', 'END:VEVENT'); });
  lines.push('END:VCALENDAR'); return lines.join('\r\n');
}

/** Keeps only the newest alert per record (e.g. the 1-day warning replaces the 3- and 2-day ones for the same lot). */
export function latestPerSource(alerts: AppAlert[]) {
  const latest = new Map<string, AppAlert>();
  alerts.forEach((alert) => { const key = `${alert.kind}:${alert.sourceId}`; const current = latest.get(key); if (!current || alert.referenceDate > current.referenceDate) latest.set(key, alert); });
  return alerts.filter((alert) => latest.get(`${alert.kind}:${alert.sourceId}`) === alert);
}
