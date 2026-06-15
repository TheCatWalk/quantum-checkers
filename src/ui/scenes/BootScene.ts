import Phaser from 'phaser';

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

    // Semi-transparent background panel for text visibility
    const panelWidth = 600;
    const panelHeight = 280;
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);  // Dark semi-transparent
    panel.fillRect(cx - panelWidth / 2, cy - 100, panelWidth, panelHeight);
    panel.lineStyle(2, 0x00ffff, 0.8);  // Neon cyan border
    panel.strokeRect(cx - panelWidth / 2, cy - 100, panelWidth, panelHeight);

    // QUANTUM text - cyan with glow
    const quantumText = this.add.text(cx, cy - 45, 'QUANTUM', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#00ffff',
      fontStyle: 'bold',
      stroke: '#0099cc',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // CHECKERS text - gold/yellow with glow
    const checkersText = this.add.text(cx, cy + 25, 'CHECKERS', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#cc9900',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Click prompt - bright cyan
    const prompt = this.add.text(cx, cy + 120, 'CLICK ANYWHERE TO PLAY', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00ffff',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Pulse the title text for sci-fi effect
    this.tweens.add({
      targets: [quantumText, checkersText],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Blink the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Cubic.InOut',
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
  }
}
