'use client';

import { useEffect } from 'react';
import type { DemoState } from '@/lib/demo-store';

const money = (value: number) => `$ ${value.toLocaleString('es-CO')}`;
const dateEs = (value?: string) => value ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : 'Pendiente';
const display = (value?: string | number) => value === undefined || value === null || value === '' ? 'Pendiente' : String(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);

export function openPaymentPrintWindow(state: DemoState, paymentId: string) {
  const payment = state.payments.find((item) => item.id === paymentId && !item.cancelled); if (!payment) return false;
  const supplier = state.suppliers.find((item) => item.id === payment.supplierId); const order = payment.orderId ? state.orders.find((item) => item.id === payment.orderId) : undefined; const reception = payment.receptionId ? state.receptions.find((item) => item.id === payment.receptionId) : undefined;
  const rows = [['Proveedor', supplier?.name], ['Pedido', order?.id], ['Recepción', reception?.id], ['Fecha', dateEs(payment.date)], ['Importe', money(payment.amount)], ['Método', payment.method], ['Estado', payment.status], ['Referencia', payment.reference], ['Responsable', payment.responsible], ['Notas', payment.notes]].map(([label, value]) => `<tr><th>${escapeHtml(String(label))}</th><td>${escapeHtml(display(value))}</td></tr>`).join('');
  const popup = window.open('', '_blank'); if (!popup) return false; popup.opener = null;
  popup.document.write(`<!doctype html><title>Pago ${escapeHtml(payment.id)}</title><style>body{font:16px Arial;color:#17232b;padding:32px}h1{color:#0e7490;border-bottom:3px solid #0e7490;padding-bottom:12px}table{border-collapse:collapse;width:100%;max-width:760px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}th{width:30%;background:#e2f3f7;color:#164e63}@media print{button{display:none}}</style><h1>Comprobante de pago · ${escapeHtml(payment.id)}</h1><p>${escapeHtml(state.config.companyName)} · ${escapeHtml(state.config.clientName)}</p><table>${rows}</table><p><button onclick="window.print()">Guardar como PDF</button></p>`); popup.document.close(); popup.focus(); return true;
}

export function PaymentPdf({ state, paymentId, onClose }: { state: DemoState; paymentId: string | null; onClose: () => void }) {
  const payment = state.payments.find((item) => item.id === paymentId && !item.cancelled);
  const supplier = payment ? state.suppliers.find((item) => item.id === payment.supplierId) : undefined;
  const order = payment?.orderId ? state.orders.find((item) => item.id === payment.orderId) : undefined;
  const reception = payment?.receptionId ? state.receptions.find((item) => item.id === payment.receptionId) : undefined;
  useEffect(() => { if (!payment) return; const timer = window.setTimeout(() => window.print(), 120); return () => window.clearTimeout(timer); }, [payment]);
  if (!payment) return null;
  const share = async () => {
    const text = [`Pago ${payment.id}`, `Proveedor: ${display(supplier?.name)}`, `Pedido: ${display(order?.id)}`, `Fecha: ${dateEs(payment.date)}`, `Importe: ${money(payment.amount)}`, `Método: ${display(payment.method)}`, `Referencia: ${display(payment.reference)}`, `Notas: ${display(payment.notes)}`].join('\n');
    if (navigator.share) { try { await navigator.share({ title: `Pago ${payment.id}`, text }); return; } catch { /* user cancelled: keep print fallback available */ } }
    window.print();
  };
  return <div className="print-overlay" role="dialog" aria-modal="true" aria-label={`Exportar ${payment.id}`}>
    <div className="print-toolbar no-print"><p>Guarda como PDF desde la ventana de impresión o comparte el resumen.</p><div className="flex gap-2"><button type="button" className="button-secondary" onClick={() => window.print()}>Descargar PDF</button><button type="button" className="button-secondary" onClick={share}>Compartir</button><button type="button" className="button-secondary" onClick={onClose}>Cerrar</button></div></div>
    <article className="print-document payment-print-document">
      <header className="print-header"><div className="print-brand"><img src="/logo-scpr.jpg" alt="Logo SCPR" className="print-logo" /><div><div className="print-company">{state.config.companyName}</div><h1>Comprobante de pago</h1><p>{state.config.clientName} · documento individual</p></div></div><div className="print-order-id"><span>ID del pago</span><strong>{payment.id}</strong></div></header>
      <section className="print-grid"><div><strong>Proveedor</strong><span>{display(supplier?.name)}</span><small>{display(supplier?.contact)} · {display(supplier?.phone)}</small><small>{display(supplier?.email)}</small></div><div><strong>Pedido</strong><span>{display(order?.id)}</span><strong>Recepción</strong><span>{display(reception?.id)}</span></div><div><strong>Fecha</strong><span>{dateEs(payment.date)}</span><strong>Estado</strong><span>{display(payment.status)}</span></div></section>
      <section className="print-section"><h2>Detalle</h2><table className="print-table"><tbody><tr><th>Importe</th><td>{money(payment.amount)}</td></tr><tr><th>Método</th><td>{display(payment.method)}</td></tr><tr><th>Referencia</th><td>{display(payment.reference)}</td></tr><tr><th>Responsable</th><td>{display(payment.responsible)}</td></tr><tr><th>Notas</th><td>{display(payment.notes)}</td></tr></tbody></table></section>
      <footer className="print-footer">{state.config.clientName} · Documento generado desde Control de Abastecimiento · {state.config.companyName}</footer>
    </article>
  </div>;
}
