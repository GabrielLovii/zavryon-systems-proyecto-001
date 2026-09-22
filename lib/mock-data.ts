export type OrderStatus = 'Borrador' | 'Preparado' | 'Enviado' | 'Confirmado' | 'Esperando entrega' | 'En recepción' | 'Recibido' | 'Recibido OK' | 'Con diferencias' | 'Conciliación' | 'Cerrado';
export type ReviewStatus = 'Pendiente' | 'Revisado' | 'Confirmado' | 'Rechazado';
export type ReceptionStatus = 'pending' | 'received' | 'shortage' | 'surplus' | 'substitution';
export type UserRole = 'Administrador' | 'Compras' | 'Recepción' | 'Consulta';
export type CandidateStatus = 'Pendiente' | 'Aprobado' | 'Rechazado';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'cuenta corriente';
export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado' | 'vencido';

export type AppConfig = { companyName: string; productName: string; clientName: string; businessName: string; address: string; phone: string; headerNote: string };
export type Supplier = { id: string; name: string; contact: string; phone: string; email: string; address: string; terms: string; notes: string; active: boolean };
export type Product = { id: string; name: string; sku: string; brand?: string; category: string; unit: string; stock: number; minimum: number; active: boolean; currency?: string; availability?: string; expiry?: string; sourceId?: string };
export type SupplierProduct = { id: string; supplierId: string; productId: string; price: number; currency?: string; externalCode?: string; brand?: string; category?: string; presentation?: string; unit?: string; availability?: string; minimum?: number; active: boolean };
export type OrderLine = { id: string; productId: string; quantity: number; price: number };
export type Order = { id: string; supplierId: string; lines: OrderLine[]; expectedDate: string; notes: string; responsible: string; status: OrderStatus; createdAt: string };
export type ReceptionLine = { id: string; orderLineId: string; status: ReceptionStatus; expected: number; received: number; expiry: string; lot: string; note: string; controlExpiry?: boolean };
export type Reception = { id: string; orderId: string; lines: ReceptionLine[]; createdAt: string; arrivedAt?: string; responsible?: string };
export type Payment = { id: string; supplierId: string; orderId?: string; receptionId?: string; amount: number; date: string; method: PaymentMethod; status: PaymentStatus; reference: string; notes: string; responsible?: string; cancelled?: boolean };
export type Expiry = { id: string; supplierId: string; productId: string; lot: string; quantity: number; date: string; receptionId: string };
export type User = { id: string; name: string; email?: string; role: UserRole; active: boolean; createdAt: string };
export type SourceCandidate = { id: string; name: string; sku: string; brand: string; unit: string; category: string; price: number; currency: string; availability: string; expiry: string; status: CandidateStatus; notes: string };
export type Source = { id: string; supplierId: string; kind: 'PDF' | 'URL'; name: string; url?: string; fileName?: string; size?: number; contentType?: string; date: string; status: ReviewStatus; notes: string; provenance: string; extractionStatus: 'Pendiente' | 'Extraído' | 'Revisión manual' | 'Error'; extractionError?: string; extractedAt?: string; candidates: SourceCandidate[] };

export const today = '2026-09-21';
export const config: AppConfig = { companyName: 'ZAVRYON SYSTEMS', productName: 'Control de Abastecimiento', clientName: 'Cliente Autoservicio Don Alejo', businessName: 'Autoservicio Don Alejo', address: 'Av. Principal 123', phone: '+54 11 5555 0101', headerNote: 'Demo local operativa' };
export const suppliers: Supplier[] = [
  { id: 'sup-norte', name: 'Distribuciones Norte', contact: 'María Gómez', phone: '+54 11 5555 0101', email: 'compras@norte.demo', address: 'Av. Industrial 120', terms: '30 días', notes: 'Entrega en muelle 2', active: true },
  { id: 'sup-frio', name: 'FrioLogistica S.A.', contact: 'Luis Mora', phone: '+54 11 5555 0102', email: 'ventas@friolog.demo', address: 'Calle 80 10-15', terms: 'Contado', notes: '', active: true },
  { id: 'sup-higiene', name: 'Higiene Total', contact: 'Jorge León', phone: '+54 11 5555 0104', email: 'pedidos@higiene.demo', address: 'Av. El Dorado 90', terms: '30 días', notes: '', active: true },
];
export const products: Product[] = [
  { id: 'prod-leche', name: 'Leche entera 1L', sku: 'LAC-001', brand: 'La Granja', category: 'Lácteos', unit: 'caja x 12', stock: 48, minimum: 30, active: true, currency: 'ARS', availability: 'Disponible' },
  { id: 'prod-film', name: 'Film stretch 50cm', sku: 'EMB-204', brand: 'PackPro', category: 'Embalaje', unit: 'rollo', stock: 12, minimum: 20, active: true, currency: 'ARS', availability: 'Disponible' },
  { id: 'prod-guantes', name: 'Guantes nitrilo M', sku: 'HIG-077', brand: 'SafeHands', category: 'Higiene', unit: 'caja x 100', stock: 86, minimum: 50, active: true, currency: 'ARS', availability: 'Disponible' },
  { id: 'prod-cafe', name: 'Café tostado 500g', sku: 'ALI-031', brand: 'Montaña', category: 'Alimentos', unit: 'pack x 10', stock: 23, minimum: 15, active: true, currency: 'ARS', availability: 'Disponible' },
];
export const supplierProducts: SupplierProduct[] = [
  { id: 'sp-1', supplierId: 'sup-norte', productId: 'prod-leche', price: 2400, currency: 'ARS', externalCode: 'N-LAC-1', brand: 'La Granja', category: 'Lácteos', presentation: 'Caja x 12', unit: 'caja', availability: 'Disponible', minimum: 1, active: true },
  { id: 'sp-2', supplierId: 'sup-norte', productId: 'prod-cafe', price: 8900, currency: 'ARS', externalCode: 'N-CAF-5', brand: 'Montaña', category: 'Alimentos', presentation: 'Pack x 10', unit: 'pack', availability: 'Disponible', minimum: 1, active: true },
  { id: 'sp-3', supplierId: 'sup-norte', productId: 'prod-film', price: 18500, currency: 'ARS', externalCode: 'N-FILM', brand: 'PackPro', category: 'Embalaje', presentation: 'Rollo 50cm', unit: 'rollo', availability: 'Disponible', minimum: 1, active: true },
  { id: 'sp-4', supplierId: 'sup-frio', productId: 'prod-leche', price: 2500, currency: 'ARS', externalCode: 'FL-001', brand: 'La Granja', category: 'Lácteos', presentation: 'Caja x 12', unit: 'caja', availability: 'Disponible', minimum: 1, active: true },
  { id: 'sp-5', supplierId: 'sup-higiene', productId: 'prod-guantes', price: 32000, currency: 'ARS', externalCode: 'HT-077', brand: 'SafeHands', category: 'Higiene', presentation: 'Caja x 100', unit: 'caja', availability: 'Disponible', minimum: 1, active: true },
];
export const initialOrders: Order[] = [{ id: 'PED-1048', supplierId: 'sup-norte', lines: [{ id: 'ol-1', productId: 'prod-leche', quantity: 48, price: 2400 }, { id: 'ol-2', productId: 'prod-cafe', quantity: 20, price: 8900 }, { id: 'ol-3', productId: 'prod-film', quantity: 12, price: 18500 }], expectedDate: today, notes: 'Descargar en muelle 2', responsible: 'Gabriel Gauto', status: 'Enviado', createdAt: today }];
export const initialReceptions: Reception[] = [{ id: 'REC-1048', orderId: 'PED-1048', createdAt: today, arrivedAt: `${today}T10:36`, responsible: 'Facundo Chamorro', lines: [{ id: 'rl-1', orderLineId: 'ol-1', status: 'received', expected: 48, received: 48, expiry: '2026-09-24', lot: 'LT-2409', note: '', controlExpiry: true }, { id: 'rl-2', orderLineId: 'ol-2', status: 'shortage', expected: 20, received: 18, expiry: '', lot: '', note: 'Faltaron 2 unidades' }, { id: 'rl-3', orderLineId: 'ol-3', status: 'pending', expected: 12, received: 0, expiry: '', lot: '', note: '' }] }];
export const initialExpiries: Expiry[] = [{ id: 'exp-1', supplierId: 'sup-norte', productId: 'prod-leche', lot: 'LT-2409', quantity: 48, date: '2026-09-24', receptionId: 'REC-1048' }];
export const initialSources: Source[] = [{ id: 'src-1', supplierId: 'sup-norte', kind: 'URL', name: 'Catálogo temporada Norte', url: 'https://proveedor.demo/catalogo', date: today, status: 'Pendiente', notes: 'Requiere revisión humana antes de importar.', provenance: 'URL pública declarada por el usuario', extractionStatus: 'Pendiente', candidates: [] }];
export const initialPayments: Payment[] = [{ id: 'PAG-001', supplierId: 'sup-norte', orderId: 'PED-1048', receptionId: 'REC-1048', amount: 250000, date: today, method: 'transferencia', status: 'parcial', reference: 'TRX-DEMO-1048', notes: 'Anticipo demo', responsible: 'Gabriel López' }, { id: 'PAG-002', supplierId: 'sup-frio', amount: 125000, date: '2026-09-15', method: 'cuenta corriente', status: 'vencido', reference: 'CC-778', notes: 'Revisar con proveedor', responsible: 'Gabriel López' }];
export const initialUsers: User[] = [{ id: 'usr-gabriel-lopez', name: 'Gabriel López', role: 'Administrador', active: true, createdAt: today }, { id: 'usr-gabriel-gauto', name: 'Gabriel Gauto', role: 'Compras', active: true, createdAt: today }, { id: 'usr-facundo-chamorro', name: 'Facundo Chamorro', role: 'Recepción', active: true, createdAt: today }, { id: 'usr-martin-ruiz-dias', name: 'Martin Ruiz Dias', role: 'Consulta', active: true, createdAt: today }];
export const alerts = [{ title: 'Vencimiento próximo', text: 'Leche entera 1L vence en 3 días' }, { title: 'Diferencia en recepción', text: 'PED-1048 tiene 2 unidades faltantes' }, { title: 'Stock bajo', text: 'Film stretch 50cm bajo el mínimo' }];
