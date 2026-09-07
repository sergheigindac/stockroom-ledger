import { ensure } from '../core/errors.js';

export class Inventory {
  constructor(store) { this.store = store; }

  balance(productId, warehouseId) {
    this.store.get('product', productId);
    this.store.get('warehouse', warehouseId);
    const balance = this.store.find('balance', b => b.productId === productId && b.warehouseId === warehouseId);
    return balance ?? { productId, warehouseId, onHand: 0, reserved: 0, available: 0 };
  }

  change(productId, warehouseId, physicalDelta, reservedDelta, reason, reference) {
    const current = this.balance(productId, warehouseId);
    const onHand = current.onHand + physicalDelta;
    const reserved = current.reserved + reservedDelta;
    ensure(Number.isSafeInteger(onHand) && onHand <= 1_000_000_000, 409, 'stock_limit', 'Stock limit exceeded');
    ensure(onHand >= 0 && reserved >= 0 && onHand >= reserved, 409, 'insufficient_stock', 'Change would make available stock negative');
    const input = { productId, warehouseId, onHand, reserved, available: onHand - reserved };
    const balance = current.id ? this.store.update('balance', current.id, input) : this.store.create('balance', input);
    const movement = this.store.create('movement', {
      productId, warehouseId, physicalDelta, reservedDelta, reason, reference,
      onHandAfter: onHand, reservedAfter: reserved,
    });
    this.store.event('inventory.changed', balance.id, { movementId: movement.id, physicalDelta, reservedDelta });
    return balance;
  }

  adjust(input) {
    return this.store.transaction(() => {
      ensure(input.delta !== 0, 422, 'zero_adjustment', 'Adjustment must change stock');
      return this.change(input.productId, input.warehouseId, input.delta, 0, input.reason, 'adjustment');
    });
  }

  transfer(input) {
    return this.store.transaction(() => {
      ensure(input.fromWarehouseId !== input.toWarehouseId, 422, 'same_warehouse', 'Transfer requires different warehouses');
      ensure(!this.store.find('transfer', t => t.reference === input.reference), 409, 'duplicate_reference', 'Transfer reference already exists');
      const transfer = this.store.create('transfer', { ...input, status: 'completed' });
      this.change(input.productId, input.fromWarehouseId, -input.quantity, 0, 'transfer.out', transfer.id);
      this.change(input.productId, input.toWarehouseId, input.quantity, 0, 'transfer.in', transfer.id);
      this.store.event('transfer.completed', transfer.id);
      return transfer;
    });
  }

  count(input) {
    return this.store.transaction(() => {
      const current = this.balance(input.productId, input.warehouseId);
      const count = this.store.create('count', { ...input, expected: current.onHand, variance: input.counted - current.onHand });
      this.change(input.productId, input.warehouseId, count.variance, 0, input.reason, count.id);
      this.store.event('inventory.counted', count.id, { variance: count.variance });
      return count;
    });
  }

  lowStock() {
    const result = [];
    for (const product of this.store.all('product')) {
      for (const warehouse of this.store.all('warehouse')) {
        const balance = this.balance(product.id, warehouse.id);
        if (balance.available <= product.reorderPoint) result.push({ ...balance, sku: product.sku, warehouse: warehouse.code, reorderPoint: product.reorderPoint });
      }
    }
    return result;
  }

  reconcile() {
    const movements = this.store.all('movement');
    return this.store.all('balance').map(balance => {
      const history = movements.filter(m => m.productId === balance.productId && m.warehouseId === balance.warehouseId);
      const physical = history.reduce((sum, m) => sum + m.physicalDelta, 0);
      const reserved = history.reduce((sum, m) => sum + m.reservedDelta, 0);
      return { productId: balance.productId, warehouseId: balance.warehouseId, physical, reserved, valid: physical === balance.onHand && reserved === balance.reserved };
    });
  }
}
