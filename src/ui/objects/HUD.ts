import Phaser from 'phaser';
import type { GameState } from '@core/types';
import type { BoardConfig } from '@ui/boardConfig';
import { THEME } from '@config/theme';

const BASE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: `#${THEME.colors.hudText.toString(16).padStart(6, '0')}`,
};

export class HUD {
  private readonly turnText:   Phaser.GameObjects.Text;
  private readonly piecesText: Phaser.GameObjects.Text;
  private readonly pairsText:  Phaser.GameObjects.Text;
  private readonly hintText:   Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, canvasWidth: number, boardConfig: BoardConfig) {
    this.scene = scene;
    const cx = canvasWidth / 2;
    const boardCenterY = boardConfig.offsetY + (boardConfig.boardSize * boardConfig.cellSize) / 2;
    const boardRight = boardConfig.offsetX + boardConfig.boardSize * boardConfig.cellSize;

    // Top center: Turn indicator (large and prominent)
    this.turnText = scene.add.text(cx, 32, '', {
      ...BASE_STYLE,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#00ffff',
    }).setOrigin(0.5, 0.5);
    this.createFrameBox(cx - 280, 12, 560, 50, 0x00ffff, false);

    // Right side: Pieces and captures (vertically centered on board)
    this.piecesText = scene.add.text(boardRight + 40, boardCenterY - 90, '', {
      ...BASE_STYLE,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#00ffff',
    }).setOrigin(0, 0);

    // Pairs/entangle info (below pieces with good spacing)
    this.pairsText = scene.add.text(boardRight + 40, boardCenterY + 50, '', {
      ...BASE_STYLE,
      fontSize: '16px',
      color: '#ffff00',
    }).setOrigin(0, 0);

    // Add dark background for right side info
    const rightBg = this.scene.add.graphics();
    rightBg.fillStyle(0x000000, 0.25);
    rightBg.fillRect(boardRight + 25, boardCenterY - 110, 200, 200);

    // Bottom center: Controls and tutorial (larger and more readable)
    this.hintText = scene.add.text(cx, scene.scale.height - 65, '', {
      ...BASE_STYLE,
      fontSize: '16px',
      color: '#aaaacc',
    }).setOrigin(0.5, 0.5);
    this.createFrameBox(cx - 450, scene.scale.height - 90, 900, 60, 0xaaaacc, false);
  }

  private createFrameBox(x: number, y: number, w: number, h: number, color: number, withFill = false): void {
    const graphics = this.scene.add.graphics();
    const cornerSize = 25;

    // Dark background fill (optional)
    if (withFill) {
      graphics.fillStyle(0x000000, 0.2);
      graphics.fillRect(x, y, w, h);
    }

    // Main frame
    graphics.lineStyle(2, color, 0.6);
    graphics.strokeRect(x, y, w, h);

    // Corner brackets
    graphics.lineStyle(3, color, 0.8);
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

  setEntangleMode(on: boolean): void {
    if (on) {
      this.hintText.setText('ENTANGLE MODE ACTIVE  →  Left-click: SAFE pair (blue)  •  Right-click: GAMBLE pair (gold)  •  Press E to exit');
      this.hintText.setStyle({ color: '#88aaff' });
    } else {
      this.hintText.setText('Click a piece to MOVE or CAPTURE  •  Right-click to ATTACK  •  Press E to enter ENTANGLE mode');
      this.hintText.setStyle({ color: '#aaaacc' });
    }
  }

  update(state: GameState): void {
    if (state.phase === 'game_over') {
      this.turnText.setText(
        state.winner !== null ? `GAME OVER - PLAYER ${state.winner + 1} WINS` : 'GAME OVER - DRAW',
      );
      this.pairsText.setText('');
      this.hintText.setText('Press SPACE to return to menu');
    } else {
      const playerName = state.turn === 0 ? 'LIGHT' : 'DARK';
      this.turnText.setText(`PLAYER ${state.turn + 1} (${playerName}) - YOUR TURN`);

      // Pair summary - verbose format
      const p0Pairs = state.pairs.filter(p => p.owner === 0).length;
      const p1Pairs = state.pairs.filter(p => p.owner === 1).length;
      let pairInfo = `ENTANGLED PAIRS - P1: ${p0Pairs}  P2: ${p1Pairs}`;
      if (state.pairs.length > 0) {
        const pairStr = state.pairs.map(p =>
          `${p.pairType === 'safe' ? '●' : '◆'} ${p.turnsRemaining}t`
        ).join('  ');
        pairInfo += `\n${pairStr}`;
      }
      this.pairsText.setText(pairInfo);

      this.hintText.setText('Click a piece to MOVE or CAPTURE  •  Right-click to ATTACK  •  Press E to enter ENTANGLE mode');
      this.hintText.setStyle({ color: '#aaaacc' });
    }

    // Count solid pieces only; ghost pairs are tracked separately in pairsText.
    const p0 = state.board.filter(c => c.type === 'piece' && c.player === 0).length;
    const p1 = state.board.filter(c => c.type === 'piece' && c.player === 1).length;
    // Each pair owner has their piece split into 2 ghosts (not counted above), so add back 1 per pair.
    const p0Total = p0 + state.pairs.filter(p => p.owner === 0).length;
    const p1Total = p1 + state.pairs.filter(p => p.owner === 1).length;
    const captured0 = 12 - p1Total;
    const captured1 = 12 - p0Total;
    this.piecesText.setText(`PIECES REMAINING\nPlayer 1: ${p0Total} / 12\nPlayer 2: ${p1Total} / 12\n\nCAPTURED\nPlayer 1: ${captured1}\nPlayer 2: ${captured0}`);
  }
}
