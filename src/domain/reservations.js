import { ensure } from '../core/errors.js';

export function uniqueLines(lines) {
  ensure(new Set(lines.map(line => line.productId)).size === lines.length, 422, 'duplicate_line', 'Each product may appear only once');
}

export class Reservations {
  constructor(store, inventory) { this.store = store; this.inventory = inventory; }

  create(input) {
    return this.store.transaction(() => {
      this.expire();
      uniqueLines(input.lines);
      ensure(!this.store.find('reservation', r => r.reference === input.reference), 409, 'duplicate_reference', 'Order reference already exists');
      const reservation = this.store.create('reservation', {
        ...input, status: 'active', expiresAt: this.store.clock() + input.ttlMs,
      });
      for (const line of input.lines) {
        this.inventory.change(line.productId, input.warehouseId, 0, line.quantity, 'reservation.created', reservation.id);
      }
      this.store.event('reservation.created', reservation.id);
      return reservation;
    });
  }

  active(id) {
    const reservation = this.store.get('reservation', id);
    ensure(reservation.status === 'active', 409, 'inactive_reservation', 'Reservation is no longer active');
    ensure(reservation.expiresAt > this.store.clock(), 409, 'expired_reservation', 'Reservation has expired');
    return reservation;
  }

  commit(id) {
    return this.store.transaction(() => {
      const reservation = this.active(id);
      for (const line of reservation.lines) {
        this.inventory.change(line.productId, reservation.warehouseId, -line.quantity, -line.quantity, 'reservation.committed', id);
      }
      const next = this.store.update('reservation', id, { status: 'committed', finishedAt: this.store.clock() });
      this.store.event('reservation.committed', id);
      return next;
    });
  }

  release(id, { reason }) {
    return this.store.transaction(() => {
      const reservation = this.active(id);
      return this.finish(reservation, 'released', reason);
    });
  }

  finish(reservation, status, reason) {
    for (const line of reservation.lines) {
      this.inventory.change(line.productId, reservation.warehouseId, 0, -line.quantity, 'reservation.' + status, reservation.id);
    }
    const next = this.store.update('reservation', reservation.id, { status, reason, finishedAt: this.store.clock() });
    this.store.event('reservation.' + status, reservation.id, { reason });
    return next;
  }

  expire() {
    return this.store.transaction(() => {
      let expired = 0;
      for (const reservation of this.store.all('reservation')) {
        if (reservation.status === 'active' && reservation.expiresAt <= this.store.clock()) {
          this.finish(reservation, 'expired', 'Reservation TTL elapsed');
          expired++;
        }
      }
      return { expired };
    });
  }
}
