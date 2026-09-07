import { text, integer, enumeration, object, list } from '../core/validation.js';

export const identifier = text('Resource identifier', { maxLength: 80, pattern: '^[A-Za-z0-9_-]+$' });
export const quantity = integer('Quantity in indivisible units', { minimum: 1, maximum: 1_000_000 });
export const revision = integer('Expected current record revision', { minimum: 1 });
export const productInput = object({
  sku: text('Unique stock keeping unit', { maxLength: 64, pattern: '^[A-Z0-9][A-Z0-9_-]*$' }),
  name: text('Product display name'),
  unit: enumeration('Unit label', ['each', 'box', 'kg', 'liter'], { default: 'each' }),
  reorderPoint: integer('Low availability threshold', { maximum: 1_000_000, default: 10 }),
}, ['sku', 'name']);
export const productUpdate = object({ name: productInput.properties.name, reorderPoint: productInput.properties.reorderPoint, revision }, ['name', 'revision']);
export const warehouseInput = object({
  code: text('Unique warehouse code', { maxLength: 32, pattern: '^[A-Z0-9_-]+$' }),
  name: text('Warehouse display name'), address: text('Postal address', { maxLength: 500, default: 'Unspecified' }),
}, ['code', 'name']);
export const adjustmentInput = object({
  productId: identifier, warehouseId: identifier,
  delta: integer('Signed change to physical stock', { minimum: -1_000_000, maximum: 1_000_000 }),
  reason: text('Audit reason', { maxLength: 1000 }),
});
export const line = object({ productId: identifier, quantity });
export const reservationInput = object({
  reference: text('Unique customer order reference', { maxLength: 100 }), warehouseId: identifier,
  lines: list(line, { maxItems: 50 }),
  ttlMs: integer('Reservation expiry in milliseconds', { minimum: 1000, maximum: 604_800_000, default: 900_000 }),
}, ['reference', 'warehouseId', 'lines']);
export const releaseInput = object({ reason: text('Release reason', { maxLength: 1000 }) });
export const transferInput = object({
  productId: identifier, fromWarehouseId: identifier, toWarehouseId: identifier, quantity,
  reference: text('Transfer reference', { maxLength: 100 }),
});
export const supplierInput = object({ name: text('Supplier name'), contact: text('Supplier contact', { maxLength: 300 }) });
export const purchaseInput = object({ supplierId: identifier, warehouseId: identifier, reference: text('Unique purchase reference'), lines: list(line, { maxItems: 50 }) });
export const receiptInput = object({ lines: list(line, { maxItems: 50 }), reference: text('Receipt reference') });
export const countInput = object({
  productId: identifier, warehouseId: identifier,
  counted: integer('Observed physical units', { maximum: 1_000_000 }),
  reason: text('Count context', { maxLength: 1000 }),
});
export const empty = object({});
