import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from '../client/index.js';

if (!process.env.API_TOKEN) throw new Error('Set API_TOKEN before running the example');
const client = new Client({
  baseUrl: process.env.API_URL ?? 'http://127.0.0.1:4320',
  token: process.env.API_TOKEN,
});
const suffix = randomUUID().slice(0, 8);


const product = await client.createProduct({
  sku: 'EXAMPLE-' + suffix.toUpperCase(),
  name: 'Example replacement part',
  reorderPoint: 5,
});
const main = await client.createWarehouse({
  code: 'MAIN-' + suffix.toUpperCase(),
  name: 'Example main warehouse',
});
const branch = await client.createWarehouse({
  code: 'BRANCH-' + suffix.toUpperCase(),
  name: 'Example branch warehouse',
});
const supplier = await client.createSupplier({
  name: 'Example components company',
  contact: 'orders@example.test',
});
const purchase = await client.createPurchase({
  supplierId: supplier.id,
  warehouseId: main.id,
  reference: suffix + ':purchase',
  lines: [{ productId: product.id, quantity: 20 }],
});
await client.receivePurchase(purchase.id, {
  reference: suffix + ':receipt-1',
  lines: [{ productId: product.id, quantity: 12 }],
}, { idempotencyKey: suffix + ':receipt-1' });
const received = await client.receivePurchase(purchase.id, {
  reference: suffix + ':receipt-2',
  lines: [{ productId: product.id, quantity: 8 }],
});
assert.equal(received.purchase.status, 'received');

const order = await client.createReservation({
  reference: suffix + ':order',
  warehouseId: main.id,
  lines: [{ productId: product.id, quantity: 6 }],
});
await client.commitReservation(order.id, {}, { idempotencyKey: suffix + ':fulfill' });
await client.transferStock({
  productId: product.id,
  fromWarehouseId: main.id,
  toWarehouseId: branch.id,
  quantity: 4,
  reference: suffix + ':transfer',
});
const balances = await client.listBalances({ query: { productId: product.id } });
assert.equal(balances.items.reduce((sum, balance) => sum + balance.onHand, 0), 14);
assert.equal(balances.items.reduce((sum, balance) => sum + balance.reserved, 0), 0);
const reconciled = await client.reconciliationReport();
assert.ok(reconciled.items.every(row => row.valid));
console.log(JSON.stringify({ productId: product.id, balances: balances.items }, null, 2));
console.log('Purchase, fulfillment, transfer, and reconciliation succeeded.');
