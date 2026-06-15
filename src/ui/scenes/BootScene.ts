import Phaser from 'phaser';
import { THEME } from '@config/theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Asset loading added once sprites are ready (step 5).
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 50, 'QUANTUM', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: `#${THEME.colors.safeLink.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'CHECKERS', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: `#${THEME.colors.gambleLink.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const prompt = this.add.text(cx, cy + 110, 'Click anywhere to play', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);

    // Blink the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
  }
}
