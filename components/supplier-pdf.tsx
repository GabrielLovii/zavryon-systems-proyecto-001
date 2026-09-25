'use client';

import type { AppConfig, Supplier } from '@/lib/mock-data';

type SupplierPdfState = { config: Pick<AppConfig, 'companyName' | 'clientName'>; suppliers: Supplier[] };
const display = (value?: string) => value || 'Pendiente';
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function printSupplierWindow(config: SupplierPdfState['config'], supplier: Supplier) {
  // 'noopener' makes window.open return null, so detach the opener manually instead.
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  const rows = [['Contacto', supplier.contact], ['Teléfono', supplier.phone], ['Email', supplier.email], ['Dirección', supplier.address], ['Estado', supplier.active ? 'Activo' : 'Desactivado'], ['Preferencia de pago', supplier.terms], ['Notas', supplier.notes]];
  printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Proveedor - ${escapeHtml(supplier.name)}</title><style>body{font-family:Arial,sans-serif;color:#17232b;margin:32px}h1{color:#0e7490;border-bottom:3px solid #0e7490;padding-bottom:16px}table{border-collapse:collapse;width:100%;max-width:760px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;vertical-align:top}th{background:#e2f3f7;color:#164e63;width:32%}@media print{body{margin:0}@page{size:A4;margin:15mm}}</style></head><body><p>${escapeHtml(config.companyName)}</p><h1>Ficha de proveedor</h1><h2>${escapeHtml(supplier.name)}</h2><table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(display(value))}</td></tr>`).join('')}</table><p>${escapeHtml(config.clientName)} · Documento generado desde Control de Abastecimiento</p></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
