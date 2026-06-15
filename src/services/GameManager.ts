import type { Action, GameState } from '@core/types';
import type { RulesConfig } from '@config/types';
import { createInitialState, getLegalActions, applyAction } from '@core/RulesEngine';
import { EventBus } from './EventBus';
import { RNG } from './RNG';

export class GameManager {
  private state: GameState | null = null;
  private rules: RulesConfig | null = null;
  readonly rng = new RNG();

  /** Begin a new game with the given rule set. Emits 'state:changed' immediately. */
  start(rules: RulesConfig): void {
    this.rules = rules;
    this.rng.setSeed(Date.now());
    this.state = createInitialState(rules);
    EventBus.on('action:submitted', this.handleAction);
    EventBus.emit('state:changed', this.state);
  }

  getState(): GameState | null {
    return this.state;
  }

  /** Legal actions for whoever is currently active. UI uses this to render highlights. */
  getLegalActions(): Action[] {
    if (!this.state || !this.rules) return [];
    return getLegalActions(this.state, this.rules);
  }

  destroy(): void {
    EventBus.off('action:submitted', this.handleAction);
    this.state = null;
    this.rules = null;
  }

  private handleAction = (action: Action): void => {
    if (!this.state || !this.rules) return;
    const result = applyAction(this.state, action, this.rng, this.rules);
    this.state = result.state;
    EventBus.emit('state:changed', result.state);
    for (const event of result.events) {
      EventBus.emit('game:event', event);
    }
  };
}

export const gameManager = new GameManager();
