'use client';

import { useEffect } from 'react';
import type { Order, PaymentStatus, ReceptionLine, ReceptionStatus } from '@/lib/mock-data';

type PdfState = {
  config: { companyName: string; clientName: string };
  orders: Order[];
  suppliers: { id: string; name: string; contact: string; phone: string; email: string; address: string; terms: string; notes: string; active: boolean }[];
  products: { id: string; name: string; sku: string; unit: string }[];
  supplierProducts: { supplierId: string; productId: string; presentation?: string }[];
  receptions: { orderId: string; lines: ReceptionLine[] }[];
  payments: { orderId?: string; amount: number; date: string; method: string; status: PaymentStatus; reference: string; notes: string; cancelled?: boolean }[];
};

const receptionLabels: Record<ReceptionStatus, string> = { pending: 'Pendiente', received: 'Llegó', shortage: 'Faltante', surplus: 'Sobrante', substitution: 'Sustitución' };
const money = (value: number) => `$ ${value.toLocaleString('es-CO')}`;
const dateEs = (value?: string) => value ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : 'Pendiente';
const display = (value?: string | number) => value === undefined || value === null || value === '' ? 'Pendiente' : String(value);

export function OrderPdf({ state, orderId, onClose }: { state: PdfState; orderId: string | null; onClose: () => void }) {
  const order = state.orders.find((item) => item.id === orderId);
  const reception = order ? state.receptions.find((item) => item.orderId === order.id) : undefined;
  const supplier = order ? state.suppliers.find((item) => item.id === order.supplierId) : undefined;
  const payments = order ? state.payments.filter((item) => item.orderId === order.id && !item.cancelled) : [];

  useEffect(() => {
    if (!order) return;
    const timer = window.setTimeout(() => window.print(), 120);
    return () => window.clearTimeout(timer);
  }, [order]);

  if (!order) return null;

  return <div className="print-overlay" role="dialog" aria-modal="true" aria-label={`Exportar ${order.id}`}>
    <div className="print-toolbar no-print">
      <p>Elegí Guardar como PDF en la ventana de impresión</p>
      <div className="flex gap-2">
        <button type="button" className="button-secondary" onClick={() => window.print()}>Descargar PDF</button>
        <button type="button" className="button-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </div>
    <article className="print-document">
      <header className="print-header">
          <div className="print-brand"><img src="/logo-scpr.jpg" alt="Logo SCPR" className="print-logo" /><div><div className="print-company">{state.config.companyName}</div><h1>Control de Abastecimiento</h1><p>{state.config.clientName} · Detalle de pedido</p></div></div>
        <div className="print-order-id"><span>ID del pedido</span><strong>{order.id}</strong></div>
      </header>
      <section className="print-grid">
        <div><strong>Proveedor</strong><span>{display(supplier?.name)}</span><small>{display(supplier?.contact)} · {display(supplier?.phone)}</small><small>{display(supplier?.email)}</small><small>{display(supplier?.address)}</small></div>
        <div><strong>Creación</strong><span>{dateEs(order.createdAt)}</span><strong>Entrega prevista</strong><span>{dateEs(order.expectedDate)}</span></div>
        <div><strong>Responsable</strong><span>{display(order.responsible)}</span><strong>Estado</strong><span>{display(order.status)}</span></div>
      </section>
      <section className="print-section"><h2>Productos</h2><div className="print-table-wrap"><table className="print-table"><thead><tr><th>SKU</th><th>Producto / presentación</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th><th>Recepción</th><th>Recibida</th><th>Diferencia</th><th>Lote / vencimiento</th></tr></thead><tbody>{order.lines.map((line) => {
        const product = state.products.find((item) => item.id === line.productId);
        const presentation = state.supplierProducts.find((item) => item.supplierId === order.supplierId && item.productId === line.productId)?.presentation || product?.unit;
        const received = reception?.lines.find((item) => item.orderLineId === line.id);
        const difference = received ? received.received - line.quantity : 0;
        return <tr key={line.id}><td>{display(product?.sku)}</td><td><strong>{display(product?.name)}</strong><small>{display(presentation)}</small></td><td>{line.quantity}</td><td>{money(line.price)}</td><td>{money(line.price * line.quantity)}</td><td>{receptionLabels[received?.status || 'pending']}</td><td>{received?.received ?? 0}</td><td>{received ? difference > 0 ? `+${difference} sobrante` : difference < 0 ? `${Math.abs(difference)} faltante` : 'Sin diferencia' : 'Pendiente'}</td><td>{received ? `${display(received.lot)} / ${dateEs(received.expiry)}` : 'Pendiente'}</td></tr>;
      })}</tbody><tfoot><tr><td colSpan={4}>Total del pedido</td><td>{money(order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0))}</td><td colSpan={4} /></tr></tfoot></table></div></section>
      <section className="print-two-columns">
        <div className="print-section"><h2>Observaciones</h2><p>{display(order.notes)}</p></div>
        <div className="print-section"><h2>Estado de pago</h2><p>{payments.length ? payments.some((payment) => payment.status === 'pagado') ? 'Pagado' : payments.some((payment) => payment.status === 'vencido') ? 'Vencido' : 'Parcial / pendiente' : 'Pendiente'}</p>{payments.length ? <ul>{payments.map((payment, index) => <li key={`${payment.date}-${index}`}>{dateEs(payment.date)} · {money(payment.amount)} · {payment.method} · {payment.status} · {display(payment.reference)}{payment.notes ? ` · ${payment.notes}` : ''}</li>)}</ul> : <p>No hay pagos asociados.</p>}</div>
      </section>
       <footer className="print-footer">{state.config.clientName} · Documento generado desde Control de Abastecimiento · {state.config.companyName}</footer>
    </article>
  </div>;
}
