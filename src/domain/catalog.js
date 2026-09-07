import { ensure } from '../core/errors.js';

export class Catalog {
  constructor(store) { this.store = store; }

  createProduct(input) {
    return this.store.transaction(() => {
      ensure(!this.store.find('product', p => p.sku === input.sku), 409, 'duplicate_sku', 'SKU already exists');
      const product = this.store.create('product', input);
      this.store.event('product.created', product.id, { sku: input.sku });
      return product;
    });
  }

  updateProduct(id, { revision, ...input }) {
    return this.store.transaction(() => {
      const product = this.store.update('product', id, input, revision);
      this.store.event('product.updated', id, input);
      return product;
    });
  }

  createWarehouse(input) {
    return this.store.transaction(() => {
      ensure(!this.store.find('warehouse', w => w.code === input.code), 409, 'duplicate_code', 'Warehouse code already exists');
      const warehouse = this.store.create('warehouse', input);
      this.store.event('warehouse.created', warehouse.id, { code: input.code });
      return warehouse;
    });
  }

  createSupplier(input) {
    return this.store.transaction(() => {
      const supplier = this.store.create('supplier', input);
      this.store.event('supplier.created', supplier.id);
      return supplier;
    });
  }
}
