import { ensure } from '../core/errors.js';
import { uniqueLines } from './reservations.js';

export class Purchases {
  constructor(store, inventory) { this.store = store; this.inventory = inventory; }

  create(input) {
    return this.store.transaction(() => {
      this.store.get('supplier', input.supplierId);
      this.store.get('warehouse', input.warehouseId);
      uniqueLines(input.lines);
      for (const line of input.lines) this.store.get('product', line.productId);
      ensure(!this.store.find('purchase', p => p.reference === input.reference), 409, 'duplicate_reference', 'Purchase reference already exists');
      const purchase = this.store.create('purchase', {
        ...input, lines: input.lines.map(line => ({ ...line, received: 0 })), status: 'open',
      });
      this.store.event('purchase.created', purchase.id);
      return purchase;
    });
  }

  receive(id, input) {
    return this.store.transaction(() => {
      uniqueLines(input.lines);
      const purchase = this.store.get('purchase', id);
      ensure(['open', 'partial'].includes(purchase.status), 409, 'closed_purchase', 'Purchase is closed');
      ensure(!this.store.find('receipt', r => r.reference === input.reference), 409, 'duplicate_reference', 'Receipt reference already exists');
      const lines = purchase.lines.map(line => ({ ...line }));
      for (const received of input.lines) {
        const line = lines.find(l => l.productId === received.productId);
        ensure(line, 422, 'unknown_purchase_line', 'Product is not part of this purchase');
        ensure(line.received + received.quantity <= line.quantity, 409, 'over_receipt', 'Receipt exceeds ordered quantity');
        line.received += received.quantity;
        this.inventory.change(line.productId, purchase.warehouseId, received.quantity, 0, 'purchase.received', id);
      }
      const receipt = this.store.create('receipt', { ...input, purchaseId: id });
      const status = lines.every(line => line.received === line.quantity) ? 'received' : 'partial';
      const next = this.store.update('purchase', id, { lines, status });
      this.store.event('purchase.received', id, { receiptId: receipt.id });
      return { purchase: next, receipt };
    });
  }

  cancel(id) {
    return this.store.transaction(() => {
      const purchase = this.store.get('purchase', id);
      ensure(['open', 'partial'].includes(purchase.status), 409, 'closed_purchase', 'Purchase is already closed');
      const next = this.store.update('purchase', id, { status: 'cancelled' });
      this.store.event('purchase.cancelled', id);
      return next;
    });
  }
}
