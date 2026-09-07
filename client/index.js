import { Transport } from './transport.js';

/** Named operations for the application API. Generated from route definitions. */
export class Client extends Transport {

  /** List catalog products. */
  listProducts(options = {}) {
    return this.request('GET', "/api/products", { ...options });
  }

  /** Create a catalog product. */
  createProduct(body, options = {}) {
    return this.request('POST', "/api/products", { ...options, body });
  }

  /** Read a product. */
  getProduct(id, options = {}) {
    return this.request('GET', '/api/products/' + encodeURIComponent(id) + '', { ...options });
  }

  /** Update product metadata. */
  updateProduct(id, body, options = {}) {
    return this.request('PATCH', '/api/products/' + encodeURIComponent(id) + '', { ...options, body });
  }

  /** List warehouses. */
  listWarehouses(options = {}) {
    return this.request('GET', "/api/warehouses", { ...options });
  }

  /** Create a warehouse. */
  createWarehouse(body, options = {}) {
    return this.request('POST', "/api/warehouses", { ...options, body });
  }

  /** List physical and reserved balances. */
  listBalances(options = {}) {
    return this.request('GET', "/api/balances", { ...options });
  }

  /** Apply a signed stock adjustment. */
  adjustStock(body, options = {}) {
    return this.request('POST', "/api/adjustments", { ...options, body });
  }

  /** List the immutable stock ledger. */
  listMovements(options = {}) {
    return this.request('GET', "/api/movements", { ...options });
  }

  /** List order reservations. */
  listReservations(options = {}) {
    return this.request('GET', "/api/reservations", { ...options });
  }

  /** Reserve stock for an order. */
  createReservation(body, options = {}) {
    return this.request('POST', "/api/reservations", { ...options, body });
  }

  /** Read reservation details. */
  getReservation(id, options = {}) {
    return this.request('GET', '/api/reservations/' + encodeURIComponent(id) + '', { ...options });
  }

  /** Fulfill a reserved order. */
  commitReservation(id, body, options = {}) {
    return this.request('POST', '/api/reservations/' + encodeURIComponent(id) + '/commit', { ...options, body });
  }

  /** Release a reserved order. */
  releaseReservation(id, body, options = {}) {
    return this.request('POST', '/api/reservations/' + encodeURIComponent(id) + '/release', { ...options, body });
  }

  /** List warehouse transfers. */
  listTransfers(options = {}) {
    return this.request('GET', "/api/transfers", { ...options });
  }

  /** Transfer available stock atomically. */
  transferStock(body, options = {}) {
    return this.request('POST', "/api/transfers", { ...options, body });
  }

  /** Reconcile a physical stock count. */
  countStock(body, options = {}) {
    return this.request('POST', "/api/counts", { ...options, body });
  }

  /** List count variances. */
  listCounts(options = {}) {
    return this.request('GET', "/api/counts", { ...options });
  }

  /** List suppliers. */
  listSuppliers(options = {}) {
    return this.request('GET', "/api/suppliers", { ...options });
  }

  /** Create a supplier. */
  createSupplier(body, options = {}) {
    return this.request('POST', "/api/suppliers", { ...options, body });
  }

  /** List purchase orders. */
  listPurchases(options = {}) {
    return this.request('GET', "/api/purchases", { ...options });
  }

  /** Create a purchase order. */
  createPurchase(body, options = {}) {
    return this.request('POST', "/api/purchases", { ...options, body });
  }

  /** Receive a partial or complete delivery. */
  receivePurchase(id, body, options = {}) {
    return this.request('POST', '/api/purchases/' + encodeURIComponent(id) + '/receive', { ...options, body });
  }

  /** Cancel remaining purchase quantities. */
  cancelPurchase(id, body, options = {}) {
    return this.request('POST', '/api/purchases/' + encodeURIComponent(id) + '/cancel', { ...options, body });
  }

  /** Find products at the reorder threshold. */
  lowStockReport(options = {}) {
    return this.request('GET', "/api/reports/low-stock", { ...options });
  }

  /** Compare balances against ledger sums. */
  reconciliationReport(options = {}) {
    return this.request('GET', "/api/reports/reconcile", { ...options });
  }

  /** Release expired reservations. */
  expireReservations(body, options = {}) {
    return this.request('POST', "/api/tick", { ...options, body });
  }
}
