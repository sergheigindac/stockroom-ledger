import { Catalog } from './catalog.js';
import { Inventory } from './inventory.js';
import { Reservations } from './reservations.js';
import { Purchases } from './purchases.js';
import * as s from './schemas.js';

export function createDomain(store) {
  const catalog = new Catalog(store);
  const inventory = new Inventory(store);
  const reservations = new Reservations(store, inventory);
  const purchases = new Purchases(store, inventory);
  const routes = [
    ['GET', '/api/products', 'listProducts', 'List catalog products', null, () => store.all('product')],
    ['POST', '/api/products', 'createProduct', 'Create a catalog product', s.productInput, c => catalog.createProduct(c.body)],
    ['GET', '/api/products/:id', 'getProduct', 'Read a product', null, c => store.get('product', c.params.id)],
    ['PATCH', '/api/products/:id', 'updateProduct', 'Update product metadata', s.productUpdate, c => catalog.updateProduct(c.params.id, c.body)],
    ['GET', '/api/warehouses', 'listWarehouses', 'List warehouses', null, () => store.all('warehouse')],
    ['POST', '/api/warehouses', 'createWarehouse', 'Create a warehouse', s.warehouseInput, c => catalog.createWarehouse(c.body)],
    ['GET', '/api/balances', 'listBalances', 'List physical and reserved balances', null, c => store.all('balance').filter(b => (!c.query.productId || b.productId === c.query.productId) && (!c.query.warehouseId || b.warehouseId === c.query.warehouseId))],
    ['POST', '/api/adjustments', 'adjustStock', 'Apply a signed stock adjustment', s.adjustmentInput, c => inventory.adjust(c.body)],
    ['GET', '/api/movements', 'listMovements', 'List the immutable stock ledger', null, () => store.all('movement')],
    ['GET', '/api/reservations', 'listReservations', 'List order reservations', null, () => store.all('reservation')],
    ['POST', '/api/reservations', 'createReservation', 'Reserve stock for an order', s.reservationInput, c => reservations.create(c.body)],
    ['GET', '/api/reservations/:id', 'getReservation', 'Read reservation details', null, c => store.get('reservation', c.params.id)],
    ['POST', '/api/reservations/:id/commit', 'commitReservation', 'Fulfill a reserved order', s.empty, c => reservations.commit(c.params.id)],
    ['POST', '/api/reservations/:id/release', 'releaseReservation', 'Release a reserved order', s.releaseInput, c => reservations.release(c.params.id, c.body)],
    ['GET', '/api/transfers', 'listTransfers', 'List warehouse transfers', null, () => store.all('transfer')],
    ['POST', '/api/transfers', 'transferStock', 'Transfer available stock atomically', s.transferInput, c => inventory.transfer(c.body)],
    ['POST', '/api/counts', 'countStock', 'Reconcile a physical stock count', s.countInput, c => inventory.count(c.body)],
    ['GET', '/api/counts', 'listCounts', 'List count variances', null, () => store.all('count')],
    ['GET', '/api/suppliers', 'listSuppliers', 'List suppliers', null, () => store.all('supplier')],
    ['POST', '/api/suppliers', 'createSupplier', 'Create a supplier', s.supplierInput, c => catalog.createSupplier(c.body)],
    ['GET', '/api/purchases', 'listPurchases', 'List purchase orders', null, () => store.all('purchase')],
    ['POST', '/api/purchases', 'createPurchase', 'Create a purchase order', s.purchaseInput, c => purchases.create(c.body)],
    ['POST', '/api/purchases/:id/receive', 'receivePurchase', 'Receive a partial or complete delivery', s.receiptInput, c => purchases.receive(c.params.id, c.body)],
    ['POST', '/api/purchases/:id/cancel', 'cancelPurchase', 'Cancel remaining purchase quantities', s.empty, c => purchases.cancel(c.params.id)],
    ['GET', '/api/reports/low-stock', 'lowStockReport', 'Find products at the reorder threshold', null, () => inventory.lowStock()],
    ['GET', '/api/reports/reconcile', 'reconciliationReport', 'Compare balances against ledger sums', null, () => inventory.reconcile()],
    ['POST', '/api/tick', 'expireReservations', 'Release expired reservations', s.empty, () => reservations.expire()],
  ];
  return { routes, catalog, inventory, reservations, purchases, tick: () => reservations.expire() };
}
