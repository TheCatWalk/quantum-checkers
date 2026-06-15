import { QuantumField } from '@ui/QuantumField';
import { EventBus } from '@services/EventBus';

export class AuroraBackground {
  private quantumField: QuantumField;

  constructor() {
    this.quantumField = new QuantumField();
    EventBus.on('game:event', this.onGameEvent);
  }

  private onGameEvent = (e: { type: string }): void => {
    if (e.type === 'COLLAPSE_TRIGGERED') {
      this.quantumField.triggerCollapse();
    }
  };

  destroy(): void {
    EventBus.off('game:event', this.onGameEvent);
    this.quantumField.destroy();
  }
}
