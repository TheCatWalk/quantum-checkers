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

    // Main title - centered, layered text with glow
    const titleGroup = this.add.container(cx, cy - 80);

    // Glow layer (behind text)
    const glowText = this.add.text(0, 0, 'QUANTUM CHECKERS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '96px',
      fontStyle: 'bold',
      color: '#00ffff',
      align: 'center',
    });
    glowText.setOrigin(0.5);
    glowText.setAlpha(0.2);
    titleGroup.add(glowText);

    // Main text
    const mainText = this.add.text(0, 0, 'QUANTUM CHECKERS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '96px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#00ffff',
      strokeThickness: 3,
      align: 'center',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#00ffff',
        blur: 30,
        fill: true,
      },
    });
    mainText.setOrigin(0.5);
    titleGroup.add(mainText);

    // Fade in animation
    titleGroup.setAlpha(0);
    this.tweens.add({
      targets: titleGroup,
      alpha: 1,
      duration: 1200,
      ease: 'Power2.Out',
    });

    // Subtle glow pulsing
    this.tweens.add({
      targets: glowText,
      alpha: 0.5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Subtitle - "A Game of Quantum Strategy"
    const subtitle = this.add.text(cx, cy + 40, 'A Game of Quantum Strategy', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ffff00',
      stroke: '#cc9900',
      strokeThickness: 1,
      align: 'center',
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0);
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1200,
      delay: 600,
      ease: 'Power2.Out',
    });

    // Play button / prompt
    const playPrompt = this.add.text(cx, cy + 140, '[CLICK TO START]', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00ffff',
      fontStyle: 'bold',
      align: 'center',
    });
    playPrompt.setOrigin(0.5);
    playPrompt.setAlpha(0);
    this.tweens.add({
      targets: playPrompt,
      alpha: 1,
      duration: 800,
      delay: 1000,
      ease: 'Power2.Out',
    });

    // Glow pulse on prompt
    this.tweens.add({
      targets: playPrompt,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      delay: 1000,
      ease: 'Sine.InOut',
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
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
