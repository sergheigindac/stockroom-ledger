export interface ClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined>;
}

export interface ApiRecord {
  id: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export class Client {
  constructor(options: ClientOptions);
  request(method: string, path: string, options?: RequestOptions & { body?: unknown }): Promise<unknown>;
  pages(path: string, options?: { query?: RequestOptions['query']; pageSize?: number; signal?: AbortSignal }): AsyncGenerator<Page<ApiRecord>>;
  events(options?: { after?: number; signal?: AbortSignal }): AsyncGenerator<unknown>;

  /** List catalog products. */
  listProducts(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Create a catalog product. */
  createProduct(body: {
    /** Unique stock keeping unit */
    sku: string;
    /** Product display name */
    name: string;
    /** Unit label */
    unit?: "each" | "box" | "kg" | "liter";
    /** Low availability threshold */
    reorderPoint?: number;
  }, options?: RequestOptions): Promise<unknown>;

  /** Read a product. */
  getProduct(id: string, options?: RequestOptions): Promise<unknown>;

  /** Update product metadata. */
  updateProduct(id: string, body: {
    /** Product display name */
    name: string;
    /** Low availability threshold */
    reorderPoint?: number;
    /** Expected current record revision */
    revision: number;
  }, options?: RequestOptions): Promise<unknown>;

  /** List warehouses. */
  listWarehouses(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Create a warehouse. */
  createWarehouse(body: {
    /** Unique warehouse code */
    code: string;
    /** Warehouse display name */
    name: string;
    /** Postal address */
    address?: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** List physical and reserved balances. */
  listBalances(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Apply a signed stock adjustment. */
  adjustStock(body: {
    /** Resource identifier */
    productId: string;
    /** Resource identifier */
    warehouseId: string;
    /** Signed change to physical stock */
    delta: number;
    /** Audit reason */
    reason: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** List the immutable stock ledger. */
  listMovements(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** List order reservations. */
  listReservations(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Reserve stock for an order. */
  createReservation(body: {
    /** Unique customer order reference */
    reference: string;
    /** Resource identifier */
    warehouseId: string;
    /** lines */
    lines: Array<{
    /** Resource identifier */
    productId: string;
    /** Quantity in indivisible units */
    quantity: number;
  }>;
    /** Reservation expiry in milliseconds */
    ttlMs?: number;
  }, options?: RequestOptions): Promise<unknown>;

  /** Read reservation details. */
  getReservation(id: string, options?: RequestOptions): Promise<unknown>;

  /** Fulfill a reserved order. */
  commitReservation(id: string, body: {

  }, options?: RequestOptions): Promise<unknown>;

  /** Release a reserved order. */
  releaseReservation(id: string, body: {
    /** Release reason */
    reason: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** List warehouse transfers. */
  listTransfers(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Transfer available stock atomically. */
  transferStock(body: {
    /** Resource identifier */
    productId: string;
    /** Resource identifier */
    fromWarehouseId: string;
    /** Resource identifier */
    toWarehouseId: string;
    /** Quantity in indivisible units */
    quantity: number;
    /** Transfer reference */
    reference: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** Reconcile a physical stock count. */
  countStock(body: {
    /** Resource identifier */
    productId: string;
    /** Resource identifier */
    warehouseId: string;
    /** Observed physical units */
    counted: number;
    /** Count context */
    reason: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** List count variances. */
  listCounts(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** List suppliers. */
  listSuppliers(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Create a supplier. */
  createSupplier(body: {
    /** Supplier name */
    name: string;
    /** Supplier contact */
    contact: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** List purchase orders. */
  listPurchases(options?: RequestOptions): Promise<Page<ApiRecord>>;

  /** Create a purchase order. */
  createPurchase(body: {
    /** Resource identifier */
    supplierId: string;
    /** Resource identifier */
    warehouseId: string;
    /** Unique purchase reference */
    reference: string;
    /** lines */
    lines: Array<{
    /** Resource identifier */
    productId: string;
    /** Quantity in indivisible units */
    quantity: number;
  }>;
  }, options?: RequestOptions): Promise<unknown>;

  /** Receive a partial or complete delivery. */
  receivePurchase(id: string, body: {
    /** lines */
    lines: Array<{
    /** Resource identifier */
    productId: string;
    /** Quantity in indivisible units */
    quantity: number;
  }>;
    /** Receipt reference */
    reference: string;
  }, options?: RequestOptions): Promise<unknown>;

  /** Cancel remaining purchase quantities. */
  cancelPurchase(id: string, body: {

  }, options?: RequestOptions): Promise<unknown>;

  /** Find products at the reorder threshold. */
  lowStockReport(options?: RequestOptions): Promise<unknown>;

  /** Compare balances against ledger sums. */
  reconciliationReport(options?: RequestOptions): Promise<unknown>;

  /** Release expired reservations. */
  expireReservations(body: {

  }, options?: RequestOptions): Promise<unknown>;
}
