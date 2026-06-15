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

  constructor(scene: Phaser.Scene, canvasWidth: number, _boardConfig: BoardConfig) {
    this.scene = scene;

    // Top-left: Turn indicator
    this.turnText = scene.add.text(20, 20, '', {
      ...BASE_STYLE,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#00ffff',
    }).setOrigin(0, 0);
    this.createCornerFrame(20, 20, 300, 60);

    // Top-right: Pairs/entangle status
    this.pairsText = scene.add.text(canvasWidth - 20, 20, '', {
      ...BASE_STYLE,
      fontSize: '13px',
      color: '#ffff00',
    }).setOrigin(1, 0);
    this.createCornerFrame(canvasWidth - 320, 20, 300, 60);

    // Bottom-left: Pieces count
    this.piecesText = scene.add.text(20, scene.scale.height - 20, '', {
      ...BASE_STYLE,
      fontSize: '16px',
      color: '#00ffff',
    }).setOrigin(0, 1);
    this.createCornerFrame(20, scene.scale.height - 80, 300, 60);

    // Bottom-right: Controls hint
    this.hintText = scene.add.text(canvasWidth - 20, scene.scale.height - 20, '', {
      ...BASE_STYLE,
      fontSize: '12px',
      color: '#aaaacc',
    }).setOrigin(1, 1);
    this.createCornerFrame(canvasWidth - 450, scene.scale.height - 80, 430, 60);
  }

  private createCornerFrame(x: number, y: number, w: number, h: number): void {
    const graphics = this.scene.add.graphics();
    const cornerSize = 20;

    // Main frame
    graphics.lineStyle(1, 0x00ffff, 0.5);
    graphics.strokeRect(x, y, w, h);

    // Corner brackets
    graphics.lineStyle(2, 0x00ffff, 0.7);
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
      this.hintText.setText('ENTANGLE: safe (E) • gamble (R) • exit (E)');
      this.hintText.setStyle({ color: '#88aaff' });
    } else {
      this.hintText.setText('MOVE: click • CAPTURE: click • ENTANGLE: E');
      this.hintText.setStyle({ color: '#aaaacc' });
    }
  }

  update(state: GameState): void {
    if (state.phase === 'game_over') {
      this.turnText.setText(
        state.winner !== null ? `>> PLAYER ${state.winner + 1} WINS <<` : '>> DRAW <<',
      );
      this.pairsText.setText('');
      this.hintText.setText('');
    } else {
      const player = state.turn === 0 ? '1' : '2';
      this.turnText.setText(`[PLAYER ${player}]`);

      // Pair summary - compact format
      const p0Pairs = state.pairs.filter(p => p.owner === 0).length;
      const p1Pairs = state.pairs.filter(p => p.owner === 1).length;
      if (state.pairs.length > 0) {
        const pairStr = state.pairs.map(p =>
          `${p.pairType === 'safe' ? '●' : '◆'}${p.turnsRemaining}`
        ).join('|');
        this.pairsText.setText(`PAIRS\nP1: ${p0Pairs} P2: ${p1Pairs}\n${pairStr}`);
      } else {
        this.pairsText.setText('PAIRS\nP1: 0 P2: 0');
      }

      this.hintText.setText('MOVE: click • CAPTURE: click • ENTANGLE: E');
      this.hintText.setStyle({ color: '#aaaacc' });
    }

    // Count solid pieces only; ghost pairs are tracked separately in pairsText.
    const p0 = state.board.filter(c => c.type === 'piece' && c.player === 0).length;
    const p1 = state.board.filter(c => c.type === 'piece' && c.player === 1).length;
    // Each pair owner has their piece split into 2 ghosts (not counted above), so add back 1 per pair.
    const p0Total = p0 + state.pairs.filter(p => p.owner === 0).length;
    const p1Total = p1 + state.pairs.filter(p => p.owner === 1).length;
    this.piecesText.setText(`PIECES\nP1: ${p0Total}\nP2: ${p1Total}`);
  }
}
