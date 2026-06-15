import Phaser from 'phaser';
import type { EntanglementPair } from '@core/types';
import { THEME } from '@config/theme';
import { cellToScreen } from '@ui/boardConfig';
import type { BoardConfig } from '@ui/boardConfig';

export class EntangleLink {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pair: EntanglementPair, cfg: BoardConfig) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1);
    this.draw(pair, cfg);

    scene.tweens.add({
      targets:  this.gfx,
      alpha:    { from: THEME.alpha.linkBase, to: THEME.alpha.linkBase * 0.35 },
      ease:     'Sine.easeInOut',
      duration: THEME.durations.ghostPulse,
      yoyo:     true,
      repeat:   -1,
    });
  }

  private draw(pair: EntanglementPair, cfg: BoardConfig): void {
    const a = cellToScreen(pair.cellA, cfg);
    const b = cellToScreen(pair.cellB, cfg);
    const color = pair.pairType === 'safe' ? THEME.colors.safeLink : THEME.colors.gambleLink;
    const g = this.gfx;

    g.clear();

    // Soft outer glow
    g.lineStyle(THEME.sizes.linkWidth * 4, color, 0.12);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();

    // Core line
    g.lineStyle(THEME.sizes.linkWidth, color, 1);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();

    // Endpoint dots
    g.fillStyle(color, 1);
    g.fillCircle(a.x, a.y, THEME.sizes.linkWidth + 1);
    g.fillCircle(b.x, b.y, THEME.sizes.linkWidth + 1);

    // Countdown pips: drawn at midpoint, perpendicular to the line, above it
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const pr = THEME.sizes.countdownPipRadius;
    const n  = pair.turnsRemaining;
    const spacing = pr * 2.8;
    const offsetX = -((n - 1) * spacing) / 2;

    for (let i = 0; i < n; i++) {
      g.fillStyle(color, 0.9);
      g.fillCircle(mx + offsetX + i * spacing, my - 16, pr);
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.gfx);
    this.gfx.destroy();
  }
}
