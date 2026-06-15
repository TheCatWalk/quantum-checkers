import Phaser from 'phaser';
import { EventBus } from '@services/EventBus';

export class AuroraBackground {
  constructor(_scene: Phaser.Scene) {
    // Scene parameter reserved for future aurora-related visuals
    EventBus.on('game:event', this.onGameEvent);
  }

  private onGameEvent = (e: { type: string }): void => {
    if (e.type === 'COLLAPSE_TRIGGERED') {
      // Handle collapse visuals if needed
    }
  };

  destroy(): void {
    EventBus.off('game:event', this.onGameEvent);
  }
}
