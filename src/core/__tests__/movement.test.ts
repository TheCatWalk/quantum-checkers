import { describe, it, expect } from 'vitest';
import { createInitialState, getLegalActions, applyAction } from '../RulesEngine';
import type { GameState, CellState, Player, Action } from '../types';
import type { RulesConfig } from '@config/types';
import { RULES_STANDARD } from '@config/rules.standard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const R8 = RULES_STANDARD;  // 8×8, forcedCaptures:false

const RULES_FORCED: RulesConfig = { ...R8, forcedCaptures: true };

/** Convert (row, col) to flat cell index */
function c(row: number, col: number, size = 8): number {
  return row * size + col;
}

/** Build a minimal GameState with only the specified pieces on an otherwise empty board */
function makeState(
  pieces: { cell: number; player: Player; isKing?: boolean }[],
  turn: Player = 0,
  size: 6 | 8 = 8,
  extra?: Partial<GameState>,
): GameState {
  const board: CellState[] = Array.from({ length: size * size }, () => ({ type: 'empty' as const }));
  for (const { cell, player, isKing = false } of pieces) {
    board[cell] = { type: 'piece', player, isKing };
  }
  return {
    board, pairs: [], turn, moveNumber: 0,
    captured: [0, 0], phase: 'playing', winner: null, pendingCapture: null, pairCounter: 0,
    ...extra,
  };
}

/** Dummy no-op RNG (deterministic 0) */
const rng0 = { next: () => 0 };

/** Extract action targets for easy assertion */
function targets(actions: Action[]): number[] {
  return actions.map(a => a.type !== 'FORFEIT' ? a.to : -1).sort((a, b) => a - b);
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('places 12 pieces per player on an 8×8 board', () => {
    const s = createInitialState(R8);
    const p0 = s.board.filter(c => c.type === 'piece' && c.player === 0);
    const p1 = s.board.filter(c => c.type === 'piece' && c.player === 1);
    expect(p0).toHaveLength(12);
    expect(p1).toHaveLength(12);
  });

  it('places pieces only on dark squares', () => {
    const s = createInitialState(R8);
    s.board.forEach((cell, idx) => {
      if (cell.type === 'piece') {
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        expect((row + col) % 2, `cell ${idx} should be dark`).toBe(0);
      }
    });
  });

  it('leaves the middle rows empty', () => {
    const s = createInitialState(R8);
    for (let row = 3; row <= 4; row++) {
      for (let col = 0; col < 8; col++) {
        expect(s.board[c(row, col)].type).toBe('empty');
      }
    }
  });

  it('player 0 starts at the bottom rows', () => {
    const s = createInitialState(R8);
    for (let row = 5; row <= 7; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = s.board[c(row, col)];
        if (cell.type === 'piece') expect(cell.player).toBe(0);
      }
    }
  });

  it('starts with player 0 to move', () => {
    expect(createInitialState(R8).turn).toBe(0);
  });
});

// ─── Basic movement ───────────────────────────────────────────────────────────

describe('getLegalActions — movement', () => {
  it('player 0 piece moves diagonally upward', () => {
    // (5,1): up-left=(4,0), up-right=(4,2) — both empty
    const s = makeState([{ cell: c(5, 1), player: 0 }]);
    const actions = getLegalActions(s, R8).filter(a => a.type === 'MOVE');
    expect(targets(actions)).toEqual([c(4, 0), c(4, 2)].sort((a, b) => a - b));
  });

  it('player 1 piece moves diagonally downward', () => {
    // (2,2): down-left=(3,1), down-right=(3,3) — both empty
    const s = makeState([{ cell: c(2, 2), player: 1 }], 1);
    const actions = getLegalActions(s, R8).filter(a => a.type === 'MOVE');
    expect(targets(actions)).toEqual([c(3, 1), c(3, 3)].sort((a, b) => a - b));
  });

  it('non-king cannot move backward', () => {
    // Player 0 at (4,2): only forward (upward) moves expected, never row 5
    const s = makeState([{ cell: c(4, 2), player: 0 }]);
    const moves = getLegalActions(s, R8).filter(a => a.type === 'MOVE');
    const rows = moves.map(a => Math.floor((a as { to: number }).to / 8));
    expect(rows.every(r => r < 4)).toBe(true);
  });

  it('move blocked by own piece', () => {
    // (5,1) up-right=(4,2) blocked by own piece; only (4,0) available
    const s = makeState([
      { cell: c(5, 1), player: 0 },
      { cell: c(4, 2), player: 0 },
    ]);
    const moves = getLegalActions(s, R8).filter(a => a.type === 'MOVE' && (a as { from: number }).from === c(5, 1));
    expect(targets(moves)).toEqual([c(4, 0)]);
  });

  it('move blocked by opponent piece (no jump cell)', () => {
    // (5,1) up-left=(4,0) has opponent, landing (3,-1) out of bounds → no jump either
    const s = makeState([
      { cell: c(5, 1), player: 0 },
      { cell: c(4, 0), player: 1 },  // blocks (4,0); no landing past it
    ]);
    const moves = getLegalActions(s, R8).filter(a => a.type === 'MOVE' && (a as { from: number }).from === c(5, 1));
    // Only (4,2) remains as a move; (4,0) is occupied
    expect(targets(moves)).toEqual([c(4, 2)]);
  });

  it('returns no actions when not the active player', () => {
    // Player 1 piece on player 0's turn
    const s = makeState([{ cell: c(2, 2), player: 1 }], 0);
    expect(getLegalActions(s, R8)).toHaveLength(0);
  });

  it('returns no actions when phase is game_over', () => {
    const s = makeState([{ cell: c(4, 2), player: 0 }], 0, 8, { phase: 'game_over', winner: 1 });
    expect(getLegalActions(s, R8)).toHaveLength(0);
  });
});

// ─── Captures ─────────────────────────────────────────────────────────────────

describe('getLegalActions — captures', () => {
  it('player 0 captures an opponent piece', () => {
    // P0 at (5,3), P1 at (4,2), landing (3,1)
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const captures = getLegalActions(s, R8).filter(a => a.type === 'CAPTURE');
    expect(captures).toHaveLength(1);
    expect((captures[0] as { to: number }).to).toBe(c(3, 1));
    expect((captures[0] as { via: number }).via).toBe(c(4, 2));
  });

  it('cannot capture own piece', () => {
    // P0 at (5,3), P0 at (4,2) — no capture
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 0 },
    ]);
    const captures = getLegalActions(s, R8).filter(a => a.type === 'CAPTURE');
    expect(captures).toHaveLength(0);
  });

  it('capture blocked when landing square is occupied', () => {
    // P0 at (5,3), P1 at (4,2), P0 at (3,1) blocks landing
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
      { cell: c(3, 1), player: 0 },
    ]);
    const captures = getLegalActions(s, R8).filter(a => a.type === 'CAPTURE');
    expect(captures).toHaveLength(0);
  });

  it('forced captures: only captures returned when available', () => {
    // P0 has both a free move AND a capture; forced mode should return only the capture
    const s = makeState([
      { cell: c(5, 3), player: 0 },  // can move to (4,4) and capture over (4,2)
      { cell: c(4, 2), player: 1 },
    ]);
    const actions = getLegalActions(s, RULES_FORCED);
    expect(actions.every(a => a.type === 'CAPTURE')).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
  });

  it('non-forced mode returns both moves and captures', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const actions = getLegalActions(s, R8);
    expect(actions.some(a => a.type === 'MOVE')).toBe(true);
    expect(actions.some(a => a.type === 'CAPTURE')).toBe(true);
  });
});

// ─── applyAction — MOVE ───────────────────────────────────────────────────────

describe('applyAction — MOVE', () => {
  it('moves piece to destination and vacates origin', () => {
    const s = makeState([{ cell: c(5, 1), player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'MOVE', from: c(5, 1), to: c(4, 0) }, rng0, R8);
    expect(s2.board[c(5, 1)].type).toBe('empty');
    expect(s2.board[c(4, 0)]).toMatchObject({ type: 'piece', player: 0 });
  });

  it('switches turn after a move', () => {
    const s = makeState([{ cell: c(5, 1), player: 0 }], 0);
    const { state: s2 } = applyAction(s, { type: 'MOVE', from: c(5, 1), to: c(4, 0) }, rng0, R8);
    expect(s2.turn).toBe(1);
  });

  it('increments moveNumber', () => {
    const s = makeState([{ cell: c(5, 1), player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'MOVE', from: c(5, 1), to: c(4, 0) }, rng0, R8);
    expect(s2.moveNumber).toBe(1);
  });

  it('emits PIECE_MOVED event', () => {
    const s = makeState([{ cell: c(5, 1), player: 0 }]);
    const { events } = applyAction(s, { type: 'MOVE', from: c(5, 1), to: c(4, 0) }, rng0, R8);
    expect(events.some(e => e.type === 'PIECE_MOVED')).toBe(true);
  });

  it('does not mutate original state', () => {
    const s = makeState([{ cell: c(5, 1), player: 0 }]);
    const origTurn = s.turn;
    applyAction(s, { type: 'MOVE', from: c(5, 1), to: c(4, 0) }, rng0, R8);
    expect(s.turn).toBe(origTurn);
    expect(s.board[c(5, 1)].type).toBe('piece');
  });
});

// ─── applyAction — CAPTURE ────────────────────────────────────────────────────

describe('applyAction — CAPTURE', () => {
  const captureAction: Action = { type: 'CAPTURE', from: c(5, 3), to: c(3, 1), via: c(4, 2) };

  it('removes captured piece and moves attacking piece', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const { state: s2 } = applyAction(s, captureAction, rng0, R8);
    expect(s2.board[c(5, 3)].type).toBe('empty');
    expect(s2.board[c(4, 2)].type).toBe('empty');
    expect(s2.board[c(3, 1)]).toMatchObject({ type: 'piece', player: 0 });
  });

  it('increments the captured counter for the right player', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const { state: s2 } = applyAction(s, captureAction, rng0, R8);
    expect(s2.captured[1]).toBe(1);  // player 1 lost a piece
    expect(s2.captured[0]).toBe(0);
  });

  it('emits PIECE_CAPTURED event', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const { events } = applyAction(s, captureAction, rng0, R8);
    expect(events.some(e => e.type === 'PIECE_CAPTURED')).toBe(true);
  });

  it('switches turn when no multi-jump available', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const { state: s2 } = applyAction(s, captureAction, rng0, R8);
    expect(s2.turn).toBe(1);
    expect(s2.pendingCapture).toBeNull();
  });
});

// ─── Multi-jump ───────────────────────────────────────────────────────────────

describe('multi-jump', () => {
  // P0 at (5,1), P1 at (4,2) and (2,4)
  // First jump: (5,1)→(3,3) over (4,2)
  // Continuation: (3,3)→(1,5) over (2,4)
  const p0 = c(5, 1);
  const p1a = c(4, 2);
  const p1b = c(2, 4);
  const mid1 = c(3, 3);
  const final = c(1, 5);

  it('sets pendingCapture after first jump', () => {
    const s = makeState([
      { cell: p0,  player: 0 },
      { cell: p1a, player: 1 },
      { cell: p1b, player: 1 },
    ]);
    const { state: s2 } = applyAction(s, { type: 'CAPTURE', from: p0, to: mid1, via: p1a }, rng0, R8);
    expect(s2.pendingCapture).toBe(mid1);
    expect(s2.turn).toBe(0);  // turn does NOT switch during multi-jump
  });

  it('only returns continuation captures during pending multi-jump', () => {
    const s = makeState([
      { cell: p0,  player: 0 },
      { cell: p1a, player: 1 },
      { cell: p1b, player: 1 },
    ]);
    const { state: s2 } = applyAction(s, { type: 'CAPTURE', from: p0, to: mid1, via: p1a }, rng0, R8);
    const legal = getLegalActions(s2, R8);
    expect(legal.every(a => a.type === 'CAPTURE')).toBe(true);
    expect(legal.every(a => (a as { from: number }).from === mid1)).toBe(true);
  });

  it('clears pendingCapture and switches turn after final jump', () => {
    const s = makeState([
      { cell: p0,  player: 0 },
      { cell: p1a, player: 1 },
      { cell: p1b, player: 1 },
    ]);
    const { state: s2 } = applyAction(s, { type: 'CAPTURE', from: p0,   to: mid1, via: p1a }, rng0, R8);
    const { state: s3 } = applyAction(s2, { type: 'CAPTURE', from: mid1, to: final, via: p1b }, rng0, R8);
    expect(s3.pendingCapture).toBeNull();
    expect(s3.turn).toBe(1);
    expect(s3.board[final]).toMatchObject({ type: 'piece', player: 0 });
  });
});

// ─── King promotion ───────────────────────────────────────────────────────────

describe('king promotion', () => {
  it('player 0 becomes king on reaching row 0', () => {
    // P0 at (1,0) moving to (0,2) — but (1+0)%2=1 (light!). Use (1,1) → (0,0) or (0,2).
    // (1,1): (1+1)%2=0 ✓. Move to (0,0): (0+0)%2=0 ✓.
    const s = makeState([{ cell: c(1, 1), player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'MOVE', from: c(1, 1), to: c(0, 0) }, rng0, R8);
    expect(s2.board[c(0, 0)]).toMatchObject({ type: 'piece', player: 0, isKing: true });
  });

  it('player 1 becomes king on reaching row 7', () => {
    // P1 at (6,0) moving to (7,1): (6+0)%2=0 ✓, (7+1)%2=0 ✓
    const s = makeState([{ cell: c(6, 0), player: 1 }], 1);
    const { state: s2 } = applyAction(s, { type: 'MOVE', from: c(6, 0), to: c(7, 1) }, rng0, R8);
    expect(s2.board[c(7, 1)]).toMatchObject({ type: 'piece', player: 1, isKing: true });
  });

  it('emits KING_CROWNED event on promotion', () => {
    const s = makeState([{ cell: c(1, 1), player: 0 }]);
    const { events } = applyAction(s, { type: 'MOVE', from: c(1, 1), to: c(0, 0) }, rng0, R8);
    expect(events.some(e => e.type === 'KING_CROWNED')).toBe(true);
  });

  it('piece already king does not re-emit KING_CROWNED', () => {
    const s = makeState([{ cell: c(1, 1), player: 0, isKing: true }]);
    const { events } = applyAction(s, { type: 'MOVE', from: c(1, 1), to: c(0, 0) }, rng0, R8);
    expect(events.some(e => e.type === 'KING_CROWNED')).toBe(false);
  });
});

// ─── King movement ────────────────────────────────────────────────────────────

describe('king movement', () => {
  it('king can move in all 4 diagonal directions', () => {
    // King at (4,4) — all 4 diagonals empty
    const s = makeState([{ cell: c(4, 4), player: 0, isKing: true }]);
    const moves = getLegalActions(s, R8).filter(a => a.type === 'MOVE');
    const expected = [c(3, 3), c(3, 5), c(5, 3), c(5, 5)].sort((a, b) => a - b);
    expect(targets(moves)).toEqual(expected);
  });

  it('king can capture backward', () => {
    // P0 king at (4,4), P1 at (5,3), landing (6,2)
    const s = makeState([
      { cell: c(4, 4), player: 0, isKing: true },
      { cell: c(5, 3), player: 1 },
    ]);
    const captures = getLegalActions(s, R8).filter(a => a.type === 'CAPTURE');
    expect(captures.some(a => (a as { to: number }).to === c(6, 2))).toBe(true);
  });
});

// ─── Game-over detection ──────────────────────────────────────────────────────

describe('game over', () => {
  it('winner is player 0 when player 1 has no pieces', () => {
    // P0 captures the last P1 piece
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },  // only P1 piece
    ]);
    const { state: s2 } = applyAction(
      s, { type: 'CAPTURE', from: c(5, 3), to: c(3, 1), via: c(4, 2) }, rng0, R8,
    );
    expect(s2.phase).toBe('game_over');
    expect(s2.winner).toBe(0);
  });

  it('emits GAME_OVER event', () => {
    const s = makeState([
      { cell: c(5, 3), player: 0 },
      { cell: c(4, 2), player: 1 },
    ]);
    const { events } = applyAction(
      s, { type: 'CAPTURE', from: c(5, 3), to: c(3, 1), via: c(4, 2) }, rng0, R8,
    );
    expect(events.some(e => e.type === 'GAME_OVER')).toBe(true);
  });

  it('player with no legal moves loses', () => {
    // P0 at (2,0): up-right=(1,1) has P1; landing (0,2) has P0 piece → no capture.
    // Up-left=(1,-1) out of bounds. P0 has zero legal actions → game over, P1 wins.
    const s = makeState([
      { cell: c(2, 0), player: 0 },  // the immobilised piece
      { cell: c(1, 1), player: 1 },  // blocks capture
      { cell: c(0, 2), player: 0 },  // blocks capture landing
    ], 0);
    const legal = getLegalActions(s, R8);
    expect(legal).toHaveLength(0);
    // Trigger game over via any action that switches to player 0 (simulate by checking resolveGameOver path).
    // Since we can't call applyAction with no legal actions on P0's turn,
    // instead verify getLegalActions is the gate and the state reflects it.
    // The game-over is detected inside applyAction after the turn switches TO player 0.
    // Simulate: let P1 make a neutral move; after turn switches P0 is stuck.
    const s1 = makeState([
      { cell: c(2, 0), player: 0 },
      { cell: c(1, 1), player: 1 },
      { cell: c(0, 2), player: 0 },
      { cell: c(5, 5), player: 1 },  // extra P1 piece so it can make a move
    ], 1);
    const { state: s2 } = applyAction(s1, { type: 'MOVE', from: c(5, 5), to: c(6, 4) }, rng0, R8);
    expect(s2.phase).toBe('game_over');
    expect(s2.winner).toBe(1);
  });

  it('forfeit immediately ends the game', () => {
    const s = makeState([
      { cell: c(4, 4), player: 0 },
      { cell: c(3, 3), player: 1 },
    ]);
    const { state: s2 } = applyAction(s, { type: 'FORFEIT' }, rng0, R8);
    expect(s2.phase).toBe('game_over');
    expect(s2.winner).toBe(1);  // opponent of the forfeiting player (0) wins
  });
});
