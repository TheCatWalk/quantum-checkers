import type { Action, GameEvent, GameState } from '@core/types';

export type BusEvents = {
  'action:submitted': Action;
  'state:changed':    GameState;
  'game:event':       GameEvent;
  'ui:ready':         undefined;
};

type Handler<T> = (payload: T) => void;

// E is unconstrained — `keyof E` and `E[K]` provide full type safety without
// requiring an index signature on the concrete event map.
class TypedEventBus<E> {
  private map = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(handler as Handler<never>);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.map.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.map.get(event)?.forEach(h => (h as Handler<E[K]>)(payload));
  }
}

export const EventBus = new TypedEventBus<BusEvents>();
