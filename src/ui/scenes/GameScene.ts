import Phaser from 'phaser';
import type { Action, GameState, GameEvent, PairType, CollapseOutcome } from '@core/types';
import { RULES_STANDARD } from '@config/rules.standard';
import { THEME } from '@config/theme';
import { EventBus } from '@services/EventBus';
import { gameManager } from '@services/GameManager';
import { createBoardConfig, cellToScreen, screenToCell } from '@ui/boardConfig';
import type { BoardConfig } from '@ui/boardConfig';
import { AuroraBackground } from '@ui/objects/AuroraBackground';
import { BoardRenderer } from '@ui/objects/BoardRenderer';
import { PieceSprite }   from '@ui/objects/PieceSprite';
import { GhostSprite }   from '@ui/objects/GhostSprite';
import { EntangleLink }  from '@ui/objects/EntangleLink';
import { HUD }           from '@ui/objects/HUD';

interface PairInfo { cellA: number; cellB: number; pairType: PairType }

export class GameScene extends Phaser.Scene {
  private aurora!: AuroraBackground;
  // private constellation!: Constellation;
  private board!:  BoardRenderer;
  private boardConfig!: BoardConfig;
  private pieces!: Map<number, PieceSprite>;
  private ghosts!: Map<number, GhostSprite>;
  private links!:  EntangleLink[];
  private hud!:    HUD;

  private selectedCell: number | null = null;
  private legalActionsForSelected: Action[] = [];
  private entangleMode = false;  // toggled by E key — affects dot color and click priority

  // Retained across rebuilds so collapse events can find pair positions.
  private knownPairs = new Map<string, PairInfo>();

  constructor() { super({ key: 'GameScene' }); }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create(): void {
    this.pieces = new Map();
    this.ghosts = new Map();
    this.links  = [];
    this.knownPairs.clear();

    // Create board config centered on viewport, 60% width
    this.boardConfig = createBoardConfig(this.scale.width, this.scale.height);

    this.aurora = new AuroraBackground(this);
    // this.constellation = new Constellation(this, { starCount: 14, connectionDistance: 160, starSize: 2.5 });
    this.board  = new BoardRenderer(this, this.boardConfig);
    this.hud    = new HUD(this, this.scale.width, this.boardConfig);

    // Aurora camera grade — transparent background so aurora shows through + soft bloom + vignette.
    // (postFX is WebGL-only; guarded so a Canvas fallback still runs.)
    const cam = this.cameras.main;
    // Don't set background color - leave transparent to show aurora
    const postFX = (cam as any).postFX;
    if (postFX) {
      postFX.addVignette(0.5, 0.5, 0.85, 0.35);
      postFX.addBloom(0xffffff, 1, 1, 1, 0.7, 4);
    }

    // Disable browser right-click context menu so we can use right-click in-game.
    this.input.mouse?.disableContextMenu();

    // E key toggles entangle mode.
    this.input.keyboard?.on('keydown-E', () => {
      const state = gameManager.getState();
      if (!state || state.phase !== 'playing') return;
      this.entangleMode = !this.entangleMode;
      this.hud.setEntangleMode(this.entangleMode);
      if (this.selectedCell !== null) {
        this.board.highlight(this.legalActionsForSelected, this.selectedCell, this.entangleMode);
      }
    });

    // Register listeners BEFORE start() so the initial state:changed is caught.
    EventBus.on('state:changed', this.onStateChanged);
    EventBus.on('game:event',    this.onGameEvent);
    this.input.on('pointerdown', this.handlePointer, this);

    gameManager.start(RULES_STANDARD);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('state:changed', this.onStateChanged);
      EventBus.off('game:event',    this.onGameEvent);
      this.input.off('pointerdown', this.handlePointer, this);
      gameManager.destroy();
      this.aurora.destroy();
      // this.constellation.destroy();
      this.knownPairs.clear();
    });
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  private onStateChanged = (state: GameState): void => {
    this.rebuildPieces(state);
    this.rebuildLinks(state);
    this.hud.update(state);

    if (state.phase === 'game_over') {
      this.board.clearHighlights();
      this.showGameOver(state);
      return;
    }

    if (state.pendingCapture !== null) {
      this.selectedCell = state.pendingCapture;
      this.legalActionsForSelected = gameManager.getLegalActions();
      this.getSpriteAt(state.pendingCapture)?.setSelected(true);
      this.board.highlight(this.legalActionsForSelected, state.pendingCapture, false);
    } else {
      this.clearSelection();
    }
  };

  private onGameEvent = (e: GameEvent): void => {
    switch (e.type) {
      case 'PIECE_MOVED':
        this.handlePieceMoved(e.from, e.to);
        break;

      case 'PAIR_CREATED':
        this.knownPairs.set(e.pairId, { cellA: e.cellA, cellB: e.cellB, pairType: e.pairType });
        break;

      case 'COLLAPSE_TRIGGERED': {
        const pair = this.knownPairs.get(e.pairId);
        if (pair) {
          this.spawnMeasurementFlash();
          this.spawnCollapseFlash(pair.cellA, pair.cellB);
        }
        break;
      }

      case 'COLLAPSE_RESOLVED': {
        const pair = this.knownPairs.get(e.pairId);
        if (pair) {
          this.spawnCollapseBurst(pair.cellA, pair.cellB, e.survivingCell);
          this.spawnMeasurementBanner(pair.cellA, pair.cellB, e.outcome, e.survivingCell);
          this.knownPairs.delete(e.pairId);
        }
        break;
      }

      case 'PIECE_CAPTURED':
        this.spawnCapturePop(e.cell, e.player);
        break;

      case 'KING_CROWNED':
        this.spawnKingFlash(e.cell);
        break;

      default: break;
    }
  };

  // ─── Input ──────────────────────────────────────────────────────────────────

  private handlePointer = (pointer: Phaser.Input.Pointer): void => {
    const state = gameManager.getState();
    if (!state || state.phase !== 'playing') return;

    const clicked = screenToCell(pointer.x, pointer.y, this.boardConfig);
    if (clicked === null) return;

    const isRightClick = pointer.rightButtonDown();

    // During a multi-jump the piece is locked; only capture destinations are clickable.
    if (state.pendingCapture !== null) {
      const action = this.legalActionsForSelected.find(
        a => a.type === 'CAPTURE' && a.to === clicked,
      );
      if (action) EventBus.emit('action:submitted', action);
      return;
    }

    const cell = state.board[clicked];

    if (this.selectedCell === null) {
      if ((cell.type === 'piece' || cell.type === 'ghost') && cell.player === state.turn) {
        this.selectCell(clicked);
      }
    } else {
      // All entangle interactions (safe and gamble) require entangle mode (E key).
      // Normal mode: left-click = CAPTURE or MOVE only. Right-click does nothing extra.
      // Entangle mode: left-click = safe, right-click = gamble.
      const actionsToCell = this.legalActionsForSelected.filter(
        a => a.type !== 'FORFEIT' && a.to === clicked,
      );
      let action: Action | undefined;
      if (this.entangleMode) {
        action = isRightClick
          ? actionsToCell.find(a => a.type === 'ENTANGLE' && a.pairType === 'gamble')
          : actionsToCell.find(a => a.type === 'ENTANGLE' && a.pairType === 'safe');
      } else {
        action = actionsToCell.find(a => a.type === 'CAPTURE')
               ?? actionsToCell.find(a => a.type === 'MOVE');
      }

      if (action) {
        this.clearSelection();
        EventBus.emit('action:submitted', action);
      } else if ((cell.type === 'piece' || cell.type === 'ghost') && cell.player === state.turn) {
        this.selectCell(clicked);
      } else {
        this.clearSelection();
      }
    }
  };

  // ─── Selection ──────────────────────────────────────────────────────────────

  private selectCell(cell: number): void {
    this.clearSelection();
    this.selectedCell = cell;
    this.legalActionsForSelected = gameManager.getLegalActions().filter(
      a => a.type !== 'FORFEIT' && (a as { from: number }).from === cell,
    );
    this.getSpriteAt(cell)?.setSelected(true);
    this.board.highlight(this.legalActionsForSelected, cell, this.entangleMode);
  }

  private clearSelection(): void {
    if (this.selectedCell !== null) {
      this.getSpriteAt(this.selectedCell)?.setSelected(false);
    }
    this.selectedCell = null;
    this.legalActionsForSelected = [];
    this.entangleMode = false;
    this.hud.setEntangleMode(false);
    this.board.clearHighlights();
  }

  private getSpriteAt(cell: number): PieceSprite | GhostSprite | null {
    return this.pieces.get(cell) ?? this.ghosts.get(cell) ?? null;
  }

  // ─── Rebuild helpers ─────────────────────────────────────────────────────────

  private rebuildPieces(state: GameState): void {
    for (const s of this.pieces.values()) s.destroy();
    for (const s of this.ghosts.values()) s.destroy();
    this.pieces.clear();
    this.ghosts.clear();

    // Build a pairId → pairType lookup for ghost rendering
    const pairTypeMap = new Map<string, PairType>();
    for (const pair of state.pairs) pairTypeMap.set(pair.id, pair.pairType);

    state.board.forEach((cell, idx) => {
      const { x, y } = cellToScreen(idx, this.boardConfig);

      if (cell.type === 'piece') {
        this.pieces.set(idx, new PieceSprite(
          this, x, y, cell.player, cell.isKing, this.boardConfig.cellSize,
        ));
      } else if (cell.type === 'ghost') {
        const pt = pairTypeMap.get(cell.pairId) ?? 'safe';
        this.ghosts.set(idx, new GhostSprite(
          this, x, y, cell.player, cell.isKing, pt, this.boardConfig.cellSize,
        ));
      }
    });
  }

  private rebuildLinks(state: GameState): void {
    for (const link of this.links) link.destroy();
    this.links = [];
    for (const pair of state.pairs) {
      this.links.push(new EntangleLink(this, pair, this.boardConfig));
    }
  }

  // ─── Animation helpers ───────────────────────────────────────────────────────

  private handlePieceMoved(from: number, to: number): void {
    // state:changed already placed the sprite at `to`; teleport to `from` and tween back.
    const sprite = this.pieces.get(to);
    if (!sprite) return;
    const fromPos = cellToScreen(from, this.boardConfig);
    const toPos   = cellToScreen(to,   this.boardConfig);
    sprite.animateMove(fromPos.x, fromPos.y, toPos.x, toPos.y);
  }

  private spawnCollapseFlash(cellA: number, cellB: number): void {
    for (const cell of [cellA, cellB]) {
      const { x, y } = cellToScreen(cell, this.boardConfig);
      const g = this.add.graphics();
      g.setDepth(4);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(0, 0, this.boardConfig.cellSize * 0.48);
      g.setPosition(x, y);
      this.tweens.add({
        targets: g, alpha: 0,
        duration: THEME.durations.collapseHold,
        ease: 'Power2',
        onComplete: () => g.destroy(),
      });
    }
  }

  private spawnCollapseBurst(cellA: number, cellB: number, survivingCell: number | null): void {
    const cells = [cellA, cellB];
    for (const cell of cells) {
      const { x, y } = cellToScreen(cell, this.boardConfig);
      const survived = survivingCell === cell;
      const color = survived ? 0xffff88 : 0xaaaaff;

      const g = this.add.graphics();
      g.setDepth(4);
      g.fillStyle(color, 0.85);
      g.fillCircle(0, 0, this.boardConfig.cellSize * 0.36);
      g.setPosition(x, y);
      g.setScale(0.4);

      this.tweens.add({
        targets: g,
        alpha:   { from: 0.85, to: 0 },
        scaleX:  2.2,
        scaleY:  2.2,
        duration: THEME.durations.collapseReveal,
        ease:    'Power2.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  // ─── Measurement moment (the quantum "observe → collapse" payload) ───────────

  /** Quick screen-wide flash the instant a superposition is measured. */
  private spawnMeasurementFlash(): void {
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(0xffffff, 0.16);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    this.tweens.add({
      targets: g, alpha: 0,
      duration: 300, ease: 'Power2',
      onComplete: () => g.destroy(),
    });
  }

  /** Pop-in banner announcing the measurement, its 50/50 odds, and the result. */
  private spawnMeasurementBanner(
    cellA: number,
    cellB: number,
    outcome: CollapseOutcome,
    survivingCell: number | null,
  ): void {
    const cx = this.scale.width / 2;
    const bannerY = 150;

    // Outcome-specific result line + accent colour
    let result: string;
    let accent: string;
    if (outcome === 'gamble_win') {
      result = 'WIN!  both pieces are real';
      accent = '#7cff9b';
    } else if (outcome === 'gamble_lose') {
      result = 'GONE!  both pieces vanished';
      accent = '#ff8080';
    } else {
      // safe_a / safe_b — superposition snapped to a single square
      const size = this.boardConfig.boardSize;
      const lost = survivingCell === cellA ? cellB : cellA;
      const dir = survivingCell !== null && (survivingCell % size) < (lost % size)
        ? 'LEFT' : 'RIGHT';
      result = `it chose:  ${dir}`;
      accent = '#ffd447';
    }

    const cardW = 360, cardH = 96;
    const card = this.add.graphics();
    card.fillStyle(0x0a0a1f, 0.92);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
    card.lineStyle(2, 0x8a8aff, 0.85);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

    const title = this.add.text(0, -26, 'OBSERVED!', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const odds = this.add.text(0, 2, '50%   /   50%', {
      fontFamily: 'monospace', fontSize: '15px', color: '#aab0ff',
    }).setOrigin(0.5);

    const res = this.add.text(0, 24, result, {
      fontFamily: 'monospace', fontSize: '15px', color: accent, fontStyle: 'bold',
    }).setOrigin(0.5);

    const banner = this.add.container(cx, bannerY, [card, title, odds, res]).setDepth(9);
    banner.setScale(0.7);
    banner.setAlpha(0);

    this.tweens.add({
      targets: banner, scaleX: 1, scaleY: 1, alpha: 1,
      ease: 'Back.easeOut', duration: 260,
    });
    this.tweens.add({
      targets: banner, alpha: 0, y: bannerY - 26,
      delay: 1150, duration: 340, ease: 'Power2',
      onComplete: () => banner.destroy(),
    });
  }

  private spawnCapturePop(cell: number, capturedPlayer: number): void {
    const { x, y } = cellToScreen(cell, this.boardConfig);
    // Colour-match the captured piece
    const color = capturedPlayer === 0 ? THEME.colors.playerA : THEME.colors.playerB;
    const g = this.add.graphics();
    g.setDepth(4);
    g.fillStyle(color, 0.75);
    g.fillCircle(0, 0, this.boardConfig.cellSize * THEME.sizes.pieceRadiusFraction);
    g.setPosition(x, y);
    g.setScale(0.7);
    this.tweens.add({
      targets:  g,
      scaleX:   1.8,
      scaleY:   1.8,
      alpha:    0,
      duration: THEME.durations.capturePop * 2,
      ease:     'Power2.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  private spawnKingFlash(cell: number): void {
    const { x, y } = cellToScreen(cell, this.boardConfig);
    const g = this.add.graphics();
    g.setDepth(4);
    g.lineStyle(4, 0xffcc00, 1);
    g.strokeCircle(0, 0, this.boardConfig.cellSize * 0.42);
    g.setPosition(x, y);
    this.tweens.add({
      targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6,
      duration: THEME.durations.kingSparkle,
      ease: 'Power2',
      onComplete: () => g.destroy(),
    });
  }

  // ─── Game-over overlay ───────────────────────────────────────────────────────

  private showGameOver(state: GameState): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Dark overlay
    const overlay = this.add.graphics().setDepth(10);
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, w, h);

    // Card background
    const cardW = 420, cardH = 220;
    const card = this.add.graphics().setDepth(11);
    card.fillStyle(0x0d0d1a, 1);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);

    // Glowing border (winner colour or neutral)
    const borderColor = state.winner === 0 ? THEME.colors.playerA
                      : state.winner === 1 ? THEME.colors.playerB
                      : 0x888888;
    card.lineStyle(2, borderColor, 0.8);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);

    // Pulsing glow behind card
    const glow = this.add.graphics().setDepth(10);
    glow.fillStyle(borderColor, 0.08);
    glow.fillRoundedRect(cx - cardW / 2 - 12, cy - cardH / 2 - 12, cardW + 24, cardH + 24, 24);
    this.tweens.add({
      targets: glow, alpha: { from: 1, to: 0.3 },
      ease: 'Sine.easeInOut', duration: 900, yoyo: true, repeat: -1,
    });

    // Winner / draw message — starts off-screen above, slides down
    const msg = state.winner !== null ? `Player ${state.winner + 1} Wins!` : 'Draw!';
    const titleText = this.add.text(cx, cy - cardH / 2 - 30, msg, {
      fontFamily: 'monospace', fontSize: '40px',
      color: state.winner !== null ? '#ffcc00' : '#aaaaaa',
      fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: titleText, alpha: 1,
      y: cy - cardH / 2 + 54,
      ease: 'Back.easeOut', duration: 500,
    });

    // Score line
    const capturedByWinner = state.winner !== null ? state.captured[state.winner === 0 ? 1 : 0] : null;
    const scoreMsg = capturedByWinner !== null
      ? `${capturedByWinner} piece${capturedByWinner !== 1 ? 's' : ''} captured`
      : `${state.captured[0]} vs ${state.captured[1]}`;

    const scoreText = this.add.text(cx, cy + 4, scoreMsg, {
      fontFamily: 'monospace', fontSize: '18px',
      color: '#aaaacc',
    }).setOrigin(0.5).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: scoreText, alpha: 1,
      ease: 'Power2', duration: 400, delay: 300,
    });

    // Play Again button
    const btn = this.add.text(cx, cy + cardH / 2 - 32, 'Play Again', {
      fontFamily: 'monospace', fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#22224a',
      padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: btn, alpha: 1,
      ease: 'Power2', duration: 400, delay: 500,
    });

    btn.on('pointerover',  () => btn.setStyle({ color: '#ffcc00', backgroundColor: '#2a2a5a' }));
    btn.on('pointerout',   () => btn.setStyle({ color: '#ffffff', backgroundColor: '#22224a' }));
    btn.on('pointerdown',  () => this.scene.restart());
  }
}
