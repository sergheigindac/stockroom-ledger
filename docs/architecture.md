# Architecture

## Purpose

An order system must distinguish physical inventory from stock promised to customers. Stockroom Ledger keeps a transactional movement ledger and uses reservations to prevent concurrent orders from selling the same units.

The entry point is src/main.js. It validates configuration, opens SQLite, builds the domain service, starts HTTP, and schedules periodic maintenance. Domain constructors accept a Store whose clock is replaceable in tests.

## Components

~~~mermaid
flowchart LR
  Browser[Operations console] --> HTTP[HTTP adapter]
  Client[JavaScript client] --> HTTP
  CLI[Command-line client] --> HTTP
  HTTP --> Validation[Request validation]
  Validation --> Idempotency[Idempotency boundary]
  Idempotency --> Domain[Domain commands and queries]
  Timer[Periodic scheduler] --> Domain
  Domain --> Store[SQLite unit of work]
  Store --> Records[(Versioned records)]
  Store --> Events[(Audit events)]
  Store --> Keys[(Idempotency responses)]
~~~

## Request lifecycle

1. HTTP creates a request identifier and applies security headers.
2. Public health and static assets are handled before authentication.
3. A per-address rate limit bounds operational requests and failed authentication attempts.
4. The adapter checks the bearer token with constant-time comparison for equal-length values.
5. Routing extracts identifiers and rejects malformed path components.
6. Mutation bodies must be JSON and fit within 64 KiB.
7. Schemas reject unknown fields, apply defaults, and check types and bounds.
8. A SQLite transaction optionally replays an idempotent response and calls the domain command.
9. The command validates state and writes records and audit events.
10. The transaction commits before its response is sent. Logs include timing and status, not tokens or payloads.

## State machine

~~~mermaid
stateDiagram-v2
  [*] --> active: reserve available units
  active --> committed: fulfill before expiry
  active --> released: customer cancellation
  active --> expired: deadline reached
  committed --> [*]
  released --> [*]
  expired --> [*]
~~~

## Domain guarantees

The invariant is onHand >= reserved >= 0, with available = onHand - reserved. Every stock mutation validates this invariant before recording the balance and movement. Quantities are safe integers representing indivisible units. A kg label does not enable fractional quantities.

Reservations validate every line in one transaction. If any line lacks stock, the reservation, earlier balance changes, and audit events all roll back. Fulfillment decreases physical and reserved stock by the same quantity. Release only decreases reserved stock.

Transfers debit the source and credit the destination in one transaction. A destination error rolls back the source debit. Physical counts cannot reduce onHand below active reservations; operators must resolve those commitments before applying the count.

## Periodic work

The scheduler releases expired active reservations. New reservation requests also attempt expiration first. Committing an expired reservation is always rejected, even before the scheduler updates its stored status. Until an expiration transaction succeeds, a balance may conservatively include expired holds.

The interval defaults to one second and accepts 100 ms to 60 seconds. Callbacks are synchronous, so ticks do not overlap within a process. Restarts re-evaluate persisted deadlines. Failed ticks are logged and retried on the next interval.

## Persistence

The records table uses (kind, id) as its primary key. Each row stores revision, created_at, updated_at, and JSON body. The body includes metadata for API serialization. Store.update cannot change identity or creation time.

The events table assigns a monotonically increasing sequence. Consumers request events after their last processed sequence. Event IDs are UUIDs; sequences are database-local and cannot be compared across unrelated databases.

The idempotency table stores fingerprints and response bodies for 24 hours. Fingerprints include operation identity, path parameters, and validated body. Object keys are sorted recursively; array order remains significant. Reusing a key with another fingerprint returns a conflict.

Mutations start with BEGIN IMMEDIATE. Nested operations use savepoints. Promise-returning transaction callbacks are rejected because asynchronous work cannot safely share this synchronous transaction boundary.

## Failure boundaries

| Failure | Result |
| --- | --- |
| Validation fails | No domain mutation begins |
| Domain constraint fails | Records, events, and response cache roll back |
| Process dies before commit | SQLite recovers the transaction |
| Process dies after commit but before response | Keyed retry returns the saved response |
| Key is reused with changed content | Conflict; use a new logical request key |
| Stale revision | Conflict; reload and reconcile |
| Disk unavailable | Request fails; no successful durability claim is returned |
| Scheduler fails | Error is logged; later ticks retry |

## Concurrency and scale

SQLite serializes writers. Synchronous domain work prevents request callbacks from interleaving inside a command. Another local process can open the file, but the supported deployment is one service process with HTTP clients.

Do not place the database on a network filesystem or share a volume across machines. Collection queries load records by kind and filter in JavaScript. Offset pagination is not a snapshot. Memory and latency increase with record count.

A scaling path would move hot queries into indexed SQL, implement retention, measure contention, and then evaluate a server database. Preserve command interfaces and atomic invariants while changing persistence.

## Security boundary

The service assumes one trusted administrative tenant. The token permits all operations. Bind to localhost for evaluation or use an authenticated TLS proxy. The rate limiter uses the TCP peer address and ignores forwarded headers.

The browser inserts values through textContent and stores no token in browser storage. Assets come from a fixed allowlist. The API offers neither a filesystem path reader nor an arbitrary outbound request endpoint.

## Test evidence

Domain tests use a controlled clock. HTTP tests use real local sockets. Persistence tests reopen SQLite files and validate online backups. Competing-request tests issue concurrent clients and verify final state. Smoke tests launch the actual entry point as a child process.

These checks establish behavior for the tested runtime and scenarios. They do not establish production capacity, host-failure availability, or support for every filesystem.
