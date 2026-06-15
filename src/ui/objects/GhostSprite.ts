import Phaser from 'phaser';
import type { Player, PairType } from '@core/types';
import { THEME } from '@config/theme';

export class GhostSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly selectionGfx: Phaser.GameObjects.Graphics;
  private readonly r: number;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    player: Player,
    isKing: boolean,
    pairType: PairType,
    cellSize: number,
  ) {
    this.scene = scene;
    this.r = Math.round(cellSize * THEME.sizes.pieceRadiusFraction);
    const r = this.r;
    const base   = player === 0 ? THEME.colors.playerA       : THEME.colors.playerB;
    const stroke = player === 0 ? THEME.colors.playerAStroke : THEME.colors.playerBStroke;
    const aura   = pairType === 'safe' ? THEME.colors.safeLink : THEME.colors.gambleLink;

    this.selectionGfx = scene.add.graphics();

    // Faint additive halo (tight, like the solid orbs)
    const glow = scene.add.graphics();
    glow.setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 3; i++) {
      glow.fillStyle(base, 0.045 + i * 0.03);
      glow.fillCircle(0, 0, r * (1.5 - i * 0.3));
    }

    // Hollow, translucent "wavefunction" orb — present but not fully here
    const body = scene.add.graphics();
    body.fillStyle(base, 0.28);
    body.fillCircle(0, 0, r);
    body.lineStyle(2, stroke, 0.9);
    body.strokeCircle(0, 0, r);
    body.lineStyle(1, base, 0.6);
    body.strokeCircle(0, 0, r * 0.55);   // inner shell

    // Pair-type aura ring (cyan = safe, gold = gamble)
    const ring = scene.add.graphics();
    ring.lineStyle(2.5, aura, 1);
    ring.strokeCircle(0, 0, r + 7);
    if (isKing) {
      ring.lineStyle(2.5, THEME.colors.gambleLink, 0.85);
      ring.strokeCircle(0, 0, Math.round(r * 0.5));
    }

    this.container = scene.add.container(x, y, [this.selectionGfx, glow, body, ring]);
    this.container.setAlpha(THEME.alpha.ghost);
    this.container.setDepth(2);

    // Superposition shimmer
    scene.tweens.add({
      targets: this.container,
      alpha:   { from: THEME.alpha.ghost * 0.5, to: THEME.alpha.ghost },
      ease:    'Sine.easeInOut',
      duration: THEME.durations.ghostPulse,
      yoyo:    true,
      repeat:  -1,
    });
  }

  setSelected(on: boolean): void {
    this.selectionGfx.clear();
    if (on) {
      this.selectionGfx.lineStyle(3, THEME.colors.highlight, 0.9);
      this.selectionGfx.strokeCircle(0, 0, this.r + 5);
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
  }
}
