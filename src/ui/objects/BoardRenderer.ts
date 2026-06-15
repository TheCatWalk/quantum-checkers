import Phaser from 'phaser';
import type { Action } from '@core/types';
import { THEME } from '@config/theme';
import type { BoardConfig } from '@ui/boardConfig';

export class BoardRenderer {
  private readonly boardGfx:     Phaser.GameObjects.Graphics;
  private readonly highlightGfx: Phaser.GameObjects.Graphics;
  private readonly cfg: BoardConfig;

  constructor(scene: Phaser.Scene, cfg: BoardConfig) {
    this.cfg = cfg;
    this.boardGfx     = scene.add.graphics();
    this.highlightGfx = scene.add.graphics();
    this.highlightGfx.setDepth(3);
    this.drawBoard();
  }

  private drawBoard(): void {
    const { offsetX, offsetY, cellSize, boardSize } = this.cfg;
    const span = boardSize * cellSize;

    // Cells — playable tiles glow faintly, non-playable recede into the void
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const playable = (row + col) % 2 === 0;
        this.boardGfx.fillStyle(
          playable ? THEME.colors.boardDark : THEME.colors.boardLight,
          playable ? THEME.alpha.boardTile  : THEME.alpha.boardVoid,
        );
        this.boardGfx.fillRect(
          offsetX + col * cellSize,
          offsetY + row * cellSize,
          cellSize, cellSize,
        );
      }
    }

    // Holographic grid lines
    this.boardGfx.lineStyle(1, THEME.colors.gridLine, THEME.alpha.gridLine);
    for (let i = 0; i <= boardSize; i++) {
      const p = i * cellSize;
      this.boardGfx.lineBetween(offsetX, offsetY + p, offsetX + span, offsetY + p);
      this.boardGfx.lineBetween(offsetX + p, offsetY, offsetX + p, offsetY + span);
    }

    // Neon frame — glowing border
    this.boardGfx.lineStyle(3, THEME.colors.boardFrame, 0.9);
    this.boardGfx.strokeRect(offsetX, offsetY, span, span);
  }

  /**
   * Redraw highlight layer with action hints.
   * Normal mode:  white dot (MOVE/CAPTURE) + small corner pips for available entangles.
   * Entangle mode: blue dot (safe), gold dot (gamble) — no white dots.
   */
  highlight(actions: Action[], selectedCell: number | null, entangleMode = false): void {
    this.highlightGfx.clear();
    const { offsetX, offsetY, cellSize, boardSize } = this.cfg;

    if (selectedCell !== null) {
      const row = Math.floor(selectedCell / boardSize);
      const col = selectedCell % boardSize;
      this.highlightGfx.lineStyle(3, THEME.colors.highlight, 0.9);
      this.highlightGfx.strokeRect(
        offsetX + col * cellSize + 2,
        offsetY + row * cellSize + 2,
        cellSize - 4, cellSize - 4,
      );
    }

    // Bucket actions by destination, tracking which types exist per cell
    const moveCells     = new Set<number>();
    const safeCells     = new Set<number>();
    const gambleCells   = new Set<number>();

    for (const action of actions) {
      if (action.type === 'FORFEIT') continue;
      if (action.type === 'CAPTURE' || action.type === 'MOVE') moveCells.add(action.to);
      else if (action.type === 'ENTANGLE') {
        if (action.pairType === 'safe')   safeCells.add(action.to);
        else                              gambleCells.add(action.to);
      }
    }

    const dotR  = cellSize * 0.18;
    const miniR = cellSize * 0.09;

    if (!entangleMode) {
      // Normal mode: white dots for MOVE/CAPTURE + tiny corner pips for entangle availability
      for (const cell of moveCells) {
        const row = Math.floor(cell / boardSize);
        const col = cell % boardSize;
        const cx = offsetX + col * cellSize + cellSize / 2;
        const cy = offsetY + row * cellSize + cellSize / 2;
        this.highlightGfx.fillStyle(THEME.colors.legalHint, THEME.alpha.legalHint);
        this.highlightGfx.fillCircle(cx, cy, dotR);

        if (safeCells.has(cell)) {
          this.highlightGfx.fillStyle(THEME.colors.safeLink, 0.85);
          this.highlightGfx.fillCircle(cx + dotR + miniR, cy - dotR, miniR);
        }
        if (gambleCells.has(cell)) {
          this.highlightGfx.fillStyle(THEME.colors.gambleLink, 0.85);
          this.highlightGfx.fillCircle(cx + dotR + miniR, cy + dotR, miniR);
        }
      }
      // Entangle-only cells (no MOVE available) shown at normal size
      for (const cell of safeCells) {
        if (moveCells.has(cell)) continue;
        const row = Math.floor(cell / boardSize);
        const col = cell % boardSize;
        const cx = offsetX + col * cellSize + cellSize / 2;
        const cy = offsetY + row * cellSize + cellSize / 2;
        const hasBoth = gambleCells.has(cell);
        this.highlightGfx.fillStyle(THEME.colors.safeLink, 0.7);
        this.highlightGfx.fillCircle(cx, hasBoth ? cy - dotR * 0.7 : cy, dotR * 0.75);
      }
      for (const cell of gambleCells) {
        if (moveCells.has(cell)) continue;
        const row = Math.floor(cell / boardSize);
        const col = cell % boardSize;
        const cx = offsetX + col * cellSize + cellSize / 2;
        const cy = offsetY + row * cellSize + cellSize / 2;
        const hasBoth = safeCells.has(cell);
        this.highlightGfx.fillStyle(THEME.colors.gambleLink, 0.7);
        this.highlightGfx.fillCircle(cx, hasBoth ? cy + dotR * 0.7 : cy, dotR * 0.75);
      }
    } else {
      // Entangle mode: show only safe (blue) and gamble (gold) dots
      const allEntangle = new Set([...safeCells, ...gambleCells]);
      for (const cell of allEntangle) {
        const row = Math.floor(cell / boardSize);
        const col = cell % boardSize;
        const cx = offsetX + col * cellSize + cellSize / 2;
        const cy = offsetY + row * cellSize + cellSize / 2;
        const hasSafe   = safeCells.has(cell);
        const hasGamble = gambleCells.has(cell);
        if (hasSafe) {
          this.highlightGfx.fillStyle(THEME.colors.safeLink, 0.8);
          this.highlightGfx.fillCircle(cx, hasGamble ? cy - dotR * 0.6 : cy, dotR * 0.9);
        }
        if (hasGamble) {
          this.highlightGfx.fillStyle(THEME.colors.gambleLink, 0.8);
          this.highlightGfx.fillCircle(cx, hasSafe ? cy + dotR * 0.6 : cy, dotR * 0.9);
        }
      }
    }
  }

  clearHighlights(): void {
    this.highlightGfx.clear();
  }
}
