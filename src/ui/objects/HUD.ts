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

  constructor(scene: Phaser.Scene, canvasWidth: number, boardConfig: BoardConfig) {
    const cx = canvasWidth / 2;
    const boardBottom = boardConfig.offsetY + boardConfig.boardSize * boardConfig.cellSize;

    this.turnText = scene.add.text(cx, boardConfig.offsetY / 2, '', {
      ...BASE_STYLE,
      fontSize: '22px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.piecesText = scene.add.text(cx, boardBottom + 18, '', {
      ...BASE_STYLE,
      fontSize: '15px',
    }).setOrigin(0.5, 0);

    this.pairsText = scene.add.text(cx, boardBottom + 38, '', {
      ...BASE_STYLE,
      fontSize: '13px',
    }).setOrigin(0.5, 0);

    this.hintText = scene.add.text(cx, boardBottom + 56, '', {
      ...BASE_STYLE,
      fontSize: '12px',
      color: '#aaaacc',
    }).setOrigin(0.5, 0);
  }

  setEntangleMode(on: boolean): void {
    if (on) {
      this.hintText.setText('ENTANGLE MODE  •  Click = safe (blue)  •  Right-click = gamble (gold)  •  E = exit');
      this.hintText.setStyle({ color: '#88aaff' });
    } else {
      this.hintText.setText('Click piece → move/capture  •  Press E to entangle');
      this.hintText.setStyle({ color: '#aaaacc' });
    }
  }

  update(state: GameState): void {
    if (state.phase === 'game_over') {
      this.turnText.setText(
        state.winner !== null ? `Player ${state.winner + 1} wins!` : 'Draw!',
      );
      this.pairsText.setText('');
      this.hintText.setText('');
    } else {
      const who = state.turn === 0 ? 'Player 1 (light)' : 'Player 2 (dark)';
      this.turnText.setText(`${who}'s turn`);

      // Pair summary
      const p0Pairs = state.pairs.filter(p => p.owner === 0).length;
      const p1Pairs = state.pairs.filter(p => p.owner === 1).length;
      if (state.pairs.length > 0) {
        this.pairsText.setText(
          `Pairs — P1: ${p0Pairs}  P2: ${p1Pairs}  |  ` +
          state.pairs.map(p =>
            `[${p.pairType === 'safe' ? '●' : '◆'} ${p.turnsRemaining}]`,
          ).join(' '),
        );
      } else {
        this.pairsText.setText('');
      }

      this.hintText.setText('Click piece → move/capture  •  Press E to entangle');
      this.hintText.setStyle({ color: '#aaaacc' });
    }

    // Count solid pieces only; ghost pairs are tracked separately in pairsText.
    const p0 = state.board.filter(c => c.type === 'piece' && c.player === 0).length;
    const p1 = state.board.filter(c => c.type === 'piece' && c.player === 1).length;
    // Each pair owner has their piece split into 2 ghosts (not counted above), so add back 1 per pair.
    const p0Total = p0 + state.pairs.filter(p => p.owner === 0).length;
    const p1Total = p1 + state.pairs.filter(p => p.owner === 1).length;
    this.piecesText.setText(`Player 1: ${p0Total} pieces   •   Player 2: ${p1Total} pieces`);
  }
}
