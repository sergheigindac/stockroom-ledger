import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, api } from './helpers.js';

function setup(f, stock = 10) {
  const product = f.call('createProduct', { sku: 'WIDGET', name: 'Widget' });
  const warehouse = f.call('createWarehouse', { code: 'MAIN', name: 'Main warehouse' });
  if (stock) f.call('adjustStock', { productId: product.id, warehouseId: warehouse.id, delta: stock, reason: 'Opening inventory' });
  return { product, warehouse };
}
function reserve(f, p, w, quantity = 3, reference = 'ORDER-1', extra = {}) {
  return f.call('createReservation', { reference, warehouseId: w.id, lines: [{ productId: p.id, quantity }], ...extra });
}

test('catalog uniqueness and revision checks protect product metadata', t => {
  const f = fixture(t);
  const { product } = setup(f);
  assert.throws(() => f.call('createProduct', { sku: 'WIDGET', name: 'Duplicate' }), { code: 'duplicate_sku' });
  const changed = f.call('updateProduct', { name: 'New name', revision: 1 }, { id: product.id });
  assert.equal(changed.revision, 2);
  assert.throws(() => f.call('updateProduct', { name: 'Stale', revision: 1 }, { id: product.id }), { code: 'revision_conflict' });
});

test('reservations reduce available stock without moving physical stock', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  reserve(f, product, warehouse, 4);
  const balance = f.domain.inventory.balance(product.id, warehouse.id);
  assert.equal(balance.onHand, 10);
  assert.equal(balance.reserved, 4);
  assert.equal(balance.available, 6);
});

test('overselling rejects the entire multi-line order', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  const missingStock = f.call('createProduct', { sku: 'EMPTY', name: 'Empty item' });
  assert.throws(() => f.call('createReservation', {
    reference: 'FAIL', warehouseId: warehouse.id,
    lines: [{ productId: product.id, quantity: 2 }, { productId: missingStock.id, quantity: 1 }],
  }), { code: 'insufficient_stock' });
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).reserved, 0);
  assert.equal(f.store.all('reservation').length, 0);
  assert.equal(f.store.all('movement').length, 1);
});

test('fulfillment consumes physical and reserved quantities once', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  const reservation = reserve(f, product, warehouse, 3);
  const committed = f.call('commitReservation', {}, { id: reservation.id });
  assert.equal(committed.status, 'committed');
  const balance = f.domain.inventory.balance(product.id, warehouse.id);
  assert.equal(balance.onHand, 7);
  assert.equal(balance.reserved, 0);
  assert.throws(() => f.call('commitReservation', {}, { id: reservation.id }), { code: 'inactive_reservation' });
});

test('release and expiry restore availability', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  const first = reserve(f, product, warehouse, 3);
  f.call('releaseReservation', { reason: 'Customer cancelled' }, { id: first.id });
  const second = reserve(f, product, warehouse, 4, 'ORDER-2', { ttlMs: 1000 });
  f.advance(1000);
  assert.throws(() => f.call('commitReservation', {}, { id: second.id }), { code: 'expired_reservation' });
  assert.equal(f.call('expireReservations').expired, 1);
  assert.equal(f.call('expireReservations').expired, 0);
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).available, 10);
});

test('duplicate order references and duplicate product lines are rejected', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  reserve(f, product, warehouse);
  assert.throws(() => reserve(f, product, warehouse), { code: 'duplicate_reference' });
  assert.throws(() => f.call('createReservation', {
    reference: 'DOUBLE', warehouseId: warehouse.id,
    lines: [{ productId: product.id, quantity: 1 }, { productId: product.id, quantity: 1 }],
  }), { code: 'duplicate_line' });
});

test('transfers preserve total stock and cannot move reserved units', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  const other = f.call('createWarehouse', { code: 'OTHER', name: 'Other' });
  reserve(f, product, warehouse, 7);
  const input = { productId: product.id, fromWarehouseId: warehouse.id, toWarehouseId: other.id, quantity: 4, reference: 'MOVE-1' };
  assert.throws(() => f.call('transferStock', input), { code: 'insufficient_stock' });
  assert.equal(f.store.all('transfer').length, 0);
  f.call('transferStock', { ...input, quantity: 3 });
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).onHand, 7);
  assert.equal(f.domain.inventory.balance(product.id, other.id).onHand, 3);
  assert.ok(f.domain.inventory.reconcile().every(row => row.valid));
});

test('transfers roll back source debit when destination does not exist', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  assert.throws(() => f.call('transferStock', {
    productId: product.id, fromWarehouseId: warehouse.id, toWarehouseId: 'missing', quantity: 1, reference: 'BAD',
  }), { code: 'not_found' });
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).onHand, 10);
});

test('physical counts record variance and protect active reservations', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f);
  reserve(f, product, warehouse, 8);
  assert.throws(() => f.call('countStock', { productId: product.id, warehouseId: warehouse.id, counted: 7, reason: 'Count' }), { code: 'insufficient_stock' });
  const count = f.call('countStock', { productId: product.id, warehouseId: warehouse.id, counted: 9, reason: 'Count' });
  assert.equal(count.variance, -1);
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).available, 1);
});

test('partial receipts increment stock and reject over-receipt atomically', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f, 0);
  const supplier = f.call('createSupplier', { name: 'Parts company', contact: 'orders@example.test' });
  const purchase = f.call('createPurchase', { supplierId: supplier.id, warehouseId: warehouse.id, reference: 'PO-1', lines: [{ productId: product.id, quantity: 10 }] });
  const first = f.call('receivePurchase', { reference: 'RECEIPT-1', lines: [{ productId: product.id, quantity: 4 }] }, { id: purchase.id });
  assert.equal(first.purchase.status, 'partial');
  assert.throws(() => f.call('receivePurchase', { reference: 'TOO-MANY', lines: [{ productId: product.id, quantity: 7 }] }, { id: purchase.id }), { code: 'over_receipt' });
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).onHand, 4);
  const last = f.call('receivePurchase', { reference: 'RECEIPT-2', lines: [{ productId: product.id, quantity: 6 }] }, { id: purchase.id });
  assert.equal(last.purchase.status, 'received');
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).onHand, 10);
});

test('cancelling a partially received purchase keeps received stock', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f, 0);
  const supplier = f.call('createSupplier', { name: 'Parts', contact: 'Contact' });
  const purchase = f.call('createPurchase', { supplierId: supplier.id, warehouseId: warehouse.id, reference: 'PO-2', lines: [{ productId: product.id, quantity: 10 }] });
  f.call('receivePurchase', { reference: 'R-1', lines: [{ productId: product.id, quantity: 2 }] }, { id: purchase.id });
  f.call('cancelPurchase', {}, { id: purchase.id });
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).onHand, 2);
  assert.throws(() => f.call('receivePurchase', { reference: 'R-2', lines: [{ productId: product.id, quantity: 1 }] }, { id: purchase.id }), { code: 'closed_purchase' });
});

test('low-stock report includes zero balances and reconciliation catches tampering', t => {
  const f = fixture(t);
  const { product, warehouse } = setup(f, 0);
  assert.equal(f.call('lowStockReport')[0].available, 0);
  f.call('adjustStock', { productId: product.id, warehouseId: warehouse.id, delta: 20, reason: 'Restock' });
  assert.equal(f.call('lowStockReport').length, 0);
  assert.equal(f.call('reconciliationReport')[0].valid, true);
  const balance = f.store.all('balance')[0];
  f.store.update('balance', balance.id, { onHand: 99 });
  assert.equal(f.call('reconciliationReport')[0].valid, false);
});

test('competing HTTP reservations cannot oversell the final unit', async t => {
  const f = await api(t);
  const { product, warehouse } = setup(f, 1);
  const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => f.request('/api/reservations', {
    method: 'POST', body: { reference: 'RACE-' + i, warehouseId: warehouse.id, lines: [{ productId: product.id, quantity: 1 }] },
  })));
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  assert.equal(responses.filter(r => r.status === 409).length, 7);
  assert.equal(f.domain.inventory.balance(product.id, warehouse.id).available, 0);
});
