# API reference

Local base URL: http://127.0.0.1:4320. Domain endpoints require Authorization: Bearer <API_TOKEN>. Mutations use Content-Type: application/json. Successful domain operations return 200. Timestamps are UTC Unix milliseconds.

Examples use placeholder resource identifiers. Replace them with IDs from earlier creation calls. Maintenance timestamps are illustrative and must end in the future.

## Common behavior

- Unknown fields and invalid types return 422 with the failing field path.
- Lists return items, total, limit, and offset. Maximum limit is 200.
- Revisions begin at 1 and increment after updates.
- Mutations optionally accept Idempotency-Key for 24-hour replay.
- State conflicts return 409; missing records return 404.
- /health is public; /ready, /metrics, /openapi.json, and /api/events require authentication.
- /api/events accepts after, limit, and resourceId and returns items plus a next sequence cursor.

## Operations

### listProducts

List catalog products.

~~~http
GET /api/products
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listProducts(options?).

### createProduct

Create a catalog product.

~~~http
POST /api/products
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| sku | string | Yes | Unique stock keeping unit. Max length 64 |
| name | string | Yes | Product display name. Max length 200 |
| unit | string | No | Unit label. Allowed: each, box, kg, liter. Max length 200. Default "each" |
| reorderPoint | integer | No | Low availability threshold. Minimum 0. Maximum 1000000. Default 10 |

Example body:

~~~json
{
  "sku": "WIDGET-001",
  "name": "Example name",
  "unit": "each",
  "reorderPoint": 10
}
~~~

Client method: client.createProduct(body, options?).

### getProduct

Read a product.

~~~http
GET /api/products/{id}
Authorization: Bearer <API_TOKEN>
~~~

Path parameter id: resource identifier returned by a creation operation.

Client method: client.getProduct(id, options?).

### updateProduct

Update product metadata.

~~~http
PATCH /api/products/{id}
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

Path parameter id: resource identifier returned by a creation operation.

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| name | string | Yes | Product display name. Max length 200 |
| reorderPoint | integer | No | Low availability threshold. Minimum 0. Maximum 1000000. Default 10 |
| revision | integer | Yes | Expected current record revision. Minimum 1. Maximum 1000000000 |

Example body:

~~~json
{
  "name": "Example name",
  "reorderPoint": 10,
  "revision": 1
}
~~~

Client method: client.updateProduct(id, body, options?).

### listWarehouses

List warehouses.

~~~http
GET /api/warehouses
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listWarehouses(options?).

### createWarehouse

Create a warehouse.

~~~http
POST /api/warehouses
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| code | string | Yes | Unique warehouse code. Max length 32 |
| name | string | Yes | Warehouse display name. Max length 200 |
| address | string | No | Postal address. Max length 500. Default "Unspecified" |

Example body:

~~~json
{
  "code": "MAIN",
  "name": "Example name",
  "address": "Unspecified"
}
~~~

Client method: client.createWarehouse(body, options?).

### listBalances

List physical and reserved balances.

~~~http
GET /api/balances
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listBalances(options?).

### adjustStock

Apply a signed stock adjustment.

~~~http
POST /api/adjustments
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| productId | string | Yes | Resource identifier. Max length 80 |
| warehouseId | string | Yes | Resource identifier. Max length 80 |
| delta | integer | Yes | Signed change to physical stock. Minimum -1000000. Maximum 1000000 |
| reason | string | Yes | Audit reason. Max length 1000 |

Example body:

~~~json
{
  "productId": "replace-with-resource-productid",
  "warehouseId": "replace-with-resource-warehouseid",
  "delta": 1,
  "reason": "Example reason"
}
~~~

Client method: client.adjustStock(body, options?).

### listMovements

List the immutable stock ledger.

~~~http
GET /api/movements
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listMovements(options?).

### listReservations

List order reservations.

~~~http
GET /api/reservations
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listReservations(options?).

### createReservation

Reserve stock for an order.

~~~http
POST /api/reservations
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| reference | string | Yes | Unique customer order reference. Max length 100 |
| warehouseId | string | Yes | Resource identifier. Max length 80 |
| lines | array | Yes | Max items 50 |
| ttlMs | integer | No | Reservation expiry in milliseconds. Minimum 1000. Maximum 604800000. Default 900000 |

Example body:

~~~json
{
  "reference": "Example reference",
  "warehouseId": "replace-with-resource-warehouseid",
  "lines": [
    {
      "productId": "replace-with-resource-productid",
      "quantity": 1
    }
  ],
  "ttlMs": 900000
}
~~~

Client method: client.createReservation(body, options?).

### getReservation

Read reservation details.

~~~http
GET /api/reservations/{id}
Authorization: Bearer <API_TOKEN>
~~~

Path parameter id: resource identifier returned by a creation operation.

Client method: client.getReservation(id, options?).

### commitReservation

Fulfill a reserved order.

~~~http
POST /api/reservations/{id}/commit
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

Path parameter id: resource identifier returned by a creation operation.

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| None | object | Yes | Send an empty JSON object |

Example body:

~~~json
{}
~~~

Client method: client.commitReservation(id, body, options?).

### releaseReservation

Release a reserved order.

~~~http
POST /api/reservations/{id}/release
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

Path parameter id: resource identifier returned by a creation operation.

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| reason | string | Yes | Release reason. Max length 1000 |

Example body:

~~~json
{
  "reason": "Example reason"
}
~~~

Client method: client.releaseReservation(id, body, options?).

### listTransfers

List warehouse transfers.

~~~http
GET /api/transfers
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listTransfers(options?).

### transferStock

Transfer available stock atomically.

~~~http
POST /api/transfers
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| productId | string | Yes | Resource identifier. Max length 80 |
| fromWarehouseId | string | Yes | Resource identifier. Max length 80 |
| toWarehouseId | string | Yes | Resource identifier. Max length 80 |
| quantity | integer | Yes | Quantity in indivisible units. Minimum 1. Maximum 1000000 |
| reference | string | Yes | Transfer reference. Max length 100 |

Example body:

~~~json
{
  "productId": "replace-with-resource-productid",
  "fromWarehouseId": "replace-with-resource-fromwarehouseid",
  "toWarehouseId": "replace-with-resource-towarehouseid",
  "quantity": 1,
  "reference": "Example reference"
}
~~~

Client method: client.transferStock(body, options?).

### countStock

Reconcile a physical stock count.

~~~http
POST /api/counts
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| productId | string | Yes | Resource identifier. Max length 80 |
| warehouseId | string | Yes | Resource identifier. Max length 80 |
| counted | integer | Yes | Observed physical units. Minimum 0. Maximum 1000000 |
| reason | string | Yes | Count context. Max length 1000 |

Example body:

~~~json
{
  "productId": "replace-with-resource-productid",
  "warehouseId": "replace-with-resource-warehouseid",
  "counted": 1,
  "reason": "Example reason"
}
~~~

Client method: client.countStock(body, options?).

### listCounts

List count variances.

~~~http
GET /api/counts
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listCounts(options?).

### listSuppliers

List suppliers.

~~~http
GET /api/suppliers
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listSuppliers(options?).

### createSupplier

Create a supplier.

~~~http
POST /api/suppliers
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| name | string | Yes | Supplier name. Max length 200 |
| contact | string | Yes | Supplier contact. Max length 300 |

Example body:

~~~json
{
  "name": "Example name",
  "contact": "Example contact"
}
~~~

Client method: client.createSupplier(body, options?).

### listPurchases

List purchase orders.

~~~http
GET /api/purchases
Authorization: Bearer <API_TOKEN>
~~~

Pagination: append ?limit=50&offset=0. Increase offset by the number of returned items until it reaches total. Concurrent writes can change offset-based results.

Client method: client.listPurchases(options?).

### createPurchase

Create a purchase order.

~~~http
POST /api/purchases
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| supplierId | string | Yes | Resource identifier. Max length 80 |
| warehouseId | string | Yes | Resource identifier. Max length 80 |
| reference | string | Yes | Unique purchase reference. Max length 200 |
| lines | array | Yes | Max items 50 |

Example body:

~~~json
{
  "supplierId": "replace-with-resource-supplierid",
  "warehouseId": "replace-with-resource-warehouseid",
  "reference": "Example reference",
  "lines": [
    {
      "productId": "replace-with-resource-productid",
      "quantity": 1
    }
  ]
}
~~~

Client method: client.createPurchase(body, options?).

### receivePurchase

Receive a partial or complete delivery.

~~~http
POST /api/purchases/{id}/receive
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

Path parameter id: resource identifier returned by a creation operation.

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| lines | array | Yes | Max items 50 |
| reference | string | Yes | Receipt reference. Max length 200 |

Example body:

~~~json
{
  "lines": [
    {
      "productId": "replace-with-resource-productid",
      "quantity": 1
    }
  ],
  "reference": "Example reference"
}
~~~

Client method: client.receivePurchase(id, body, options?).

### cancelPurchase

Cancel remaining purchase quantities.

~~~http
POST /api/purchases/{id}/cancel
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

Path parameter id: resource identifier returned by a creation operation.

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| None | object | Yes | Send an empty JSON object |

Example body:

~~~json
{}
~~~

Client method: client.cancelPurchase(id, body, options?).

### lowStockReport

Find products at the reorder threshold.

~~~http
GET /api/reports/low-stock
Authorization: Bearer <API_TOKEN>
~~~

Client method: client.lowStockReport(options?).

### reconciliationReport

Compare balances against ledger sums.

~~~http
GET /api/reports/reconcile
Authorization: Bearer <API_TOKEN>
~~~

Client method: client.reconciliationReport(options?).

### expireReservations

Release expired reservations.

~~~http
POST /api/tick
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <unique-logical-request-key>
~~~

| Field | Type | Required | Constraints and meaning |
| --- | --- | --- | --- |
| None | object | Yes | Send an empty JSON object |

Example body:

~~~json
{}
~~~

Client method: client.expireReservations(body, options?).

