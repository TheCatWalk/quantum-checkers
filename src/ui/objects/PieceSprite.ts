import Phaser from 'phaser';
import type { Player } from '@core/types';
import { THEME } from '@config/theme';

/** Linear blend between two hex colours (t: 0 → a, 1 → b). */
function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export class PieceSprite {
  readonly container: Phaser.GameObjects.Container;

  private readonly glowGfx:      Phaser.GameObjects.Graphics;
  private readonly bodyGfx:      Phaser.GameObjects.Graphics;
  private readonly kingGfx:      Phaser.GameObjects.Graphics;
  private readonly selectionGfx: Phaser.GameObjects.Graphics;
  private readonly player: Player;
  private readonly r: number;
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    player: Player,
    isKing: boolean,
    cellSize: number,
  ) {
    this.scene  = scene;
    this.player = player;
    this.r = Math.round(cellSize * THEME.sizes.pieceRadiusFraction);

    this.glowGfx      = scene.add.graphics();
    this.selectionGfx = scene.add.graphics();
    this.bodyGfx      = scene.add.graphics();
    this.kingGfx      = scene.add.graphics();
    this.glowGfx.setBlendMode(Phaser.BlendModes.ADD);  // additive aura

    this.container = scene.add.container(x, y, [
      this.glowGfx,
      this.selectionGfx,
      this.bodyGfx,
      this.kingGfx,
    ]);
    this.container.setDepth(2);

    this.redraw(isKing);

    // Idle "breathing" aura — perpetual. Targets the glow child (not the
    // container) so it survives the kill-all in animateMove().
    scene.tweens.add({
      targets: this.glowGfx,
      alpha:  { from: 0.65, to: 1 },
      scaleX: { from: 0.96, to: 1.06 },
      scaleY: { from: 0.96, to: 1.06 },
      duration: THEME.durations.pieceBreath,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private redraw(isKing: boolean): void {
    const r = this.r;
    const base   = this.player === 0 ? THEME.colors.playerA : THEME.colors.playerB;
    const rim    = mix(base, 0x000000, 0.45);
    const coreHi = mix(base, 0xffffff, 0.55);

    // Additive glow halo — kept tight (≈0.6 cell) so adjacent orbs don't
    // additively collide into bright webbing; the camera bloom adds the spread.
    this.glowGfx.clear();
    for (let i = 0; i < 4; i++) {
      this.glowGfx.fillStyle(base, 0.05 + i * 0.035);
      this.glowGfx.fillCircle(0, 0, r * (1.6 - i * 0.3));
    }

    // Energy-orb body: dark rim → base → hot core → specular sheen
    this.bodyGfx.clear();
    this.bodyGfx.fillStyle(rim, 1);
    this.bodyGfx.fillCircle(0, 0, r);
    this.bodyGfx.fillStyle(base, 1);
    this.bodyGfx.fillCircle(0, 0, r * 0.82);
    this.bodyGfx.fillStyle(coreHi, 0.9);
    this.bodyGfx.fillCircle(0, 0, r * 0.45);
    this.bodyGfx.fillStyle(0xffffff, 0.35);
    this.bodyGfx.fillCircle(-r * 0.28, -r * 0.28, r * 0.22);  // specular highlight
    this.bodyGfx.lineStyle(2, coreHi, 0.9);
    this.bodyGfx.strokeCircle(0, 0, r);

    // King — a charged double ring
    this.kingGfx.clear();
    if (isKing) {
      this.kingGfx.lineStyle(3, mix(base, 0xffffff, 0.85), 0.95);
      this.kingGfx.strokeCircle(0, 0, r * 0.5);
      this.kingGfx.lineStyle(1.5, THEME.colors.gambleLink, 0.8);
      this.kingGfx.strokeCircle(0, 0, r * 0.72);
    }
  }

  setSelected(on: boolean): void {
    this.selectionGfx.clear();
    if (on) {
      this.selectionGfx.lineStyle(3, THEME.colors.highlight, 0.95);
      this.selectionGfx.strokeCircle(0, 0, this.r + 6);
    }
  }

  promoteToKing(): void {
    this.redraw(true);
  }

  /** Teleports sprite to fromX/fromY then tweens to x/y — called after state:changed. */
  animateMove(fromX: number, fromY: number, x: number, y: number): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.setPosition(fromX, fromY);
    this.scene.tweens.add({
      targets:  this.container,
      x, y,
      ease:     'Power2.easeOut',
      duration: THEME.durations.pieceMove,
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.glowGfx);
    this.container.destroy();
  }
}
