import type { Order, Product, Reception, RestockItem, StockMovement, StockMovementType, Supplier, SupplierProduct } from './mock-data';

export type StockStatus = 'faltante' | 'poco' | 'bajo' | 'ok';
export const stockStatusLabels: Record<StockStatus, string> = { faltante: 'Faltante', poco: 'Poco', bajo: 'Bajo', ok: 'OK' };
export const stockMovementLabels: Record<StockMovementType, string> = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste / conteo', recepcion: 'Recepción', faltante: 'Marcado faltante' };
export const UNCATEGORIZED = 'Sin categoría';

/**
 * Stock level for a product:
 * - faltante: nothing left
 * - poco: below half of the minimum (critical)
 * - bajo: at or below the minimum
 * - ok: above the minimum (or no minimum configured and some stock left)
 */
export function stockStatus(product: Pick<Product, 'stock' | 'minimum'>): StockStatus {
  const stock = Number(product.stock) || 0;
  const minimum = Number(product.minimum) || 0;
  if (stock <= 0) return 'faltante';
  if (minimum > 0 && stock < minimum / 2) return 'poco';
  if (minimum > 0 && stock <= minimum) return 'bajo';
  return 'ok';
}

export const needsRestock = (product: Pick<Product, 'stock' | 'minimum'>) => stockStatus(product) !== 'ok';

const statusRank: Record<StockStatus, number> = { faltante: 0, poco: 1, bajo: 2, ok: 3 };
export const compareByUrgency = (a: Product, b: Product) => statusRank[stockStatus(a)] - statusRank[stockStatus(b)] || a.name.localeCompare(b.name, 'es');

/** Groups products by category (trimmed, case-insensitive), sorted alphabetically with uncategorized last. */
export function groupByCategory(products: Product[]) {
  const groups = new Map<string, { category: string; products: Product[] }>();
  products.forEach((product) => {
    const category = product.category?.trim() || UNCATEGORIZED;
    const key = category.toLocaleLowerCase('es');
    const group = groups.get(key) || { category, products: [] };
    group.products.push(product);
    groups.set(key, group);
  });
  return Array.from(groups.values())
    .map((group) => ({ ...group, products: [...group.products].sort(compareByUrgency) }))
    .sort((a, b) => (a.category === UNCATEGORIZED ? 1 : b.category === UNCATEGORIZED ? -1 : a.category.localeCompare(b.category, 'es')));
}

/** Suggested quantity to order: enough to reach twice the minimum, respecting the supplier minimum. */
export function suggestedQuantity(product: Pick<Product, 'stock' | 'minimum'>, supplierMinimum = 1) {
  const minimum = Math.max(0, Number(product.minimum) || 0);
  const stock = Math.max(0, Number(product.stock) || 0);
  const target = minimum > 0 ? minimum * 2 : 1;
  return Math.max(Math.ceil(target - stock), Math.max(1, supplierMinimum || 1));
}

/** Active supplier offers for a product, cheapest first. */
export function supplierOptions(productId: string, supplierProducts: SupplierProduct[], suppliers: Supplier[]) {
  const activeSuppliers = new Set(suppliers.filter((supplier) => supplier.active).map((supplier) => supplier.id));
  return supplierProducts
    .filter((item) => item.productId === productId && item.active && activeSuppliers.has(item.supplierId))
    .sort((a, b) => a.price - b.price);
}

export const preferredSupplier = (productId: string, supplierProducts: SupplierProduct[], suppliers: Supplier[]) => supplierOptions(productId, supplierProducts, suppliers)[0];

/** Groups the restock list by supplier; items without a supplier go under the empty key. */
export function groupRestockBySupplier(items: RestockItem[]) {
  const groups = new Map<string, RestockItem[]>();
  items.forEach((item) => groups.set(item.supplierId, [...(groups.get(item.supplierId) || []), item]));
  return groups;
}

type OrderContext = { orderIds: string[]; supplierProducts: SupplierProduct[]; responsible: string; requester: string; requestedAt: string; today: string; nextId: (ids: string[]) => string };

/** Builds one order per supplier from the restock list. Items without a supplier are skipped. */
export function buildRestockOrders(items: RestockItem[], context: OrderContext): Order[] {
  const ids = [...context.orderIds];
  const orders: Order[] = [];
  groupRestockBySupplier(items).forEach((group, supplierId) => {
    if (!supplierId) return;
    const lines = group.filter((item) => item.quantity > 0).map((item, index) => ({
      id: `ol-${Date.now()}-${supplierId}-${index}`,
      productId: item.productId,
      quantity: Math.ceil(item.quantity),
      price: context.supplierProducts.find((offer) => offer.productId === item.productId && offer.supplierId === supplierId)?.price || 0,
    }));
    if (!lines.length) return;
    const id = context.nextId(ids);
    ids.push(id);
    orders.push({ id, supplierId, lines, expectedDate: context.today, notes: 'Generado desde Abastecimiento', responsible: context.responsible, requester: context.requester, requestedAt: context.requestedAt, status: 'Preparado', createdAt: context.today });
  });
  return orders;
}

/**
 * Applies a completed reception to product stock. Each line remembers how much it already added
 * (`appliedToStock`), so saving the same reception again only applies the difference.
 * Legacy receptions that arrived before stock tracking count as already applied.
 */
export function applyReceptionToStock(products: Product[], order: Order, saved: Reception, previous: Reception | undefined, meta: { user: string; date: string }) {
  const movements: StockMovement[] = [];
  const stockById = new Map(products.map((product) => [product.id, product]));
  const lines = saved.lines.map((line) => {
    const previousLine = previous?.lines.find((item) => item.id === line.id);
    const alreadyApplied = previousLine?.appliedToStock ?? (previous?.arrivedAt ? previousLine?.received ?? 0 : 0);
    const productId = order.lines.find((item) => item.id === line.orderLineId)?.productId;
    const product = productId ? stockById.get(productId) : undefined;
    const received = Math.max(0, Number(line.received) || 0);
    const delta = received - alreadyApplied;
    if (product && delta !== 0) {
      const next = Math.max(0, product.stock + delta);
      stockById.set(product.id, { ...product, stock: next });
      movements.push({ id: `mov-${Date.now()}-${line.id}`, productId: product.id, type: 'recepcion', quantity: delta, before: product.stock, after: next, reason: `Recepción ${saved.id} · pedido ${order.id}`, user: meta.user, date: meta.date });
    }
    return { ...line, appliedToStock: received };
  });
  return { products: products.map((product) => stockById.get(product.id) || product), reception: { ...saved, lines }, movements };
}

/** Records a manual stock change and returns the updated product plus its movement entry. */
export function registerMovement(product: Product, type: StockMovementType, quantity: number, meta: { user: string; date: string; reason?: string }) {
  const amount = Math.max(0, Number(quantity) || 0);
  const after = type === 'entrada' ? product.stock + amount : type === 'salida' ? Math.max(0, product.stock - amount) : type === 'faltante' ? 0 : amount;
  const movement: StockMovement = { id: `mov-${Date.now()}-${product.id}`, productId: product.id, type, quantity: after - product.stock, before: product.stock, after, reason: meta.reason?.trim() || '', user: meta.user, date: meta.date };
  return { product: { ...product, stock: after, stockUpdatedAt: meta.date }, movement };
}

/** Value of current stock using each product's cheapest active supplier price. */
export function stockValue(products: Product[], supplierProducts: SupplierProduct[], suppliers: Supplier[]) {
  return products.reduce((sum, product) => sum + Math.max(0, product.stock) * (preferredSupplier(product.id, supplierProducts, suppliers)?.price || 0), 0);
}
