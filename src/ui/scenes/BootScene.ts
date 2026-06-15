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

    // Animated grid background
    this.createAnimatedGrid();

    // Add scan lines effect
    this.createScanLines();

    // Main title box with geometric frame
    const titleBoxWidth = 900;
    const titleBoxHeight = 200;
    const titleBox = this.add.graphics();

    titleBox.lineStyle(2, 0x00ffff, 0.6);
    titleBox.strokeRect(cx - titleBoxWidth / 2, cy - titleBoxHeight / 2 - 60, titleBoxWidth, titleBoxHeight);

    // Corner brackets (NieR style)
    this.drawCornerBrackets(titleBox, cx - titleBoxWidth / 2, cy - titleBoxHeight / 2 - 60, titleBoxWidth, titleBoxHeight);

    // Main title text
    const mainText = this.add.text(cx, cy - 60, 'QUANTUM CHECKERS', {
      fontFamily: 'monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    mainText.setOrigin(0.5, 0.5);
    mainText.setAlpha(0);
    this.tweens.add({
      targets: mainText,
      alpha: 1,
      duration: 1000,
      ease: 'Power2.Out',
    });

    // Subtitle/description box
    const subtitleBox = this.add.graphics();
    subtitleBox.lineStyle(1, 0x00ffff, 0.4);
    subtitleBox.strokeRect(cx - 400, cy + 30, 800, 60);

    const subtitle = this.add.text(cx, cy + 60, 'A Game of Quantum Strategy', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00ffff',
      align: 'center',
    });
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setAlpha(0);
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1000,
      delay: 300,
      ease: 'Power2.Out',
    });

    // Input prompt box
    const promptBox = this.add.graphics();
    promptBox.lineStyle(1, 0xffff00, 0.5);
    promptBox.strokeRect(cx - 250, cy + 130, 500, 50);

    const playPrompt = this.add.text(cx, cy + 155, '>> PRESS SPACE OR CLICK TO START <<', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffff00',
      fontStyle: 'bold',
      align: 'center',
    });
    playPrompt.setOrigin(0.5, 0.5);
    playPrompt.setAlpha(0);
    this.tweens.add({
      targets: playPrompt,
      alpha: 1,
      duration: 1000,
      delay: 600,
      ease: 'Power2.Out',
    });

    // Pulse prompt box
    this.tweens.add({
      targets: playPrompt,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      delay: 600,
      ease: 'Sine.InOut',
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }

  private drawCornerBrackets(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    const cornerSize = 40;
    const thickness = 2;

    graphics.lineStyle(thickness, 0x00ffff, 0.8);

    // Top-left
    graphics.lineBetween(x, y, x + cornerSize, y);
    graphics.lineBetween(x, y, x, y + cornerSize);

    // Top-right
    graphics.lineBetween(x + w, y, x + w - cornerSize, y);
    graphics.lineBetween(x + w, y, x + w, y + cornerSize);

    // Bottom-left
    graphics.lineBetween(x, y + h, x + cornerSize, y + h);
    graphics.lineBetween(x, y + h, x, y + h - cornerSize);

    // Bottom-right
    graphics.lineBetween(x + w, y + h, x + w - cornerSize, y + h);
    graphics.lineBetween(x + w, y + h, x + w, y + h - cornerSize);
  }

  private createScanLines(): void {
    const scanGraphics = this.add.graphics();
    scanGraphics.lineStyle(1, 0x000000, 0.1);

    for (let y = 0; y < this.scale.height; y += 4) {
      scanGraphics.lineBetween(0, y, this.scale.width, y);
    }

    // Animate scan lines for effect
    this.tweens.add({
      targets: scanGraphics,
      y: 4,
      duration: 100,
      repeat: -1,
    });
  }

  private createAnimatedGrid(): void {
    const gridSize = 50;

    const gridGraphics = this.add.graphics();

    const drawGrid = () => {
      gridGraphics.clear();
      gridGraphics.lineStyle(1, 0x00ffff, 0.15);

      // Vertical lines
      for (let x = -gridSize; x < this.scale.width + gridSize; x += gridSize) {
        gridGraphics.lineBetween(x, -gridSize, x, this.scale.height + gridSize);
      }

      // Horizontal lines
      for (let y = -gridSize; y < this.scale.height + gridSize; y += gridSize) {
        gridGraphics.lineBetween(-gridSize, y, this.scale.width + gridSize, y);
      }
    };

    drawGrid();

    // Animate grid scale for depth effect
    this.tweens.add({
      targets: gridGraphics,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
