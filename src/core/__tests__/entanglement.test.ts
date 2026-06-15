import { describe, it, expect } from 'vitest';
import { getLegalActions, applyAction } from '../RulesEngine';
import type { GameState, CellState, Player, PairType } from '../types';
import { RULES_STANDARD } from '@config/rules.standard';
import type { RulesConfig } from '@config/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function c(row: number, col: number, size = 8): number { return row * size + col; }
const noop = { next: () => 0.3 };  // deterministic RNG (< 0.5 path)

function makeState(
  pieces: { cell: number; player: Player; isKing?: boolean }[],
  pairs: GameState['pairs'] = [],
  turn: Player = 0,
  size: 6 | 8 = 8,
): GameState {
  const board: CellState[] = Array.from({ length: size * size }, () => ({ type: 'empty' as const }));
  for (const { cell, player, isKing = false } of pieces) {
    board[cell] = { type: 'piece', player, isKing };
  }
  for (const pair of pairs) {
    board[pair.cellA] = { type: 'ghost', pairId: pair.id, player: pair.owner, isKing: false };
    board[pair.cellB] = { type: 'ghost', pairId: pair.id, player: pair.owner, isKing: false };
  }
  return {
    board, pairs, turn, moveNumber: 0,
    captured: [0, 0], phase: 'playing', winner: null,
    pendingCapture: null, pairCounter: pairs.length,
  };
}

function makePair(
  cellA: number, cellB: number,
  pairType: PairType = 'safe',
  owner: Player = 0,
  turnsRemaining = 3,
  id = 'test-pair',
): GameState['pairs'][number] {
  return { id, pairType, cellA, cellB, owner, turnsRemaining };
}

const R8 = RULES_STANDARD;
const R_NO_ENTANGLE: RulesConfig = { ...R8, safePairsEnabled: false, gamblePairsEnabled: false };
const R_MAX1: RulesConfig = { ...R8, maxSimultaneousPairs: 1 };

// ─── getLegalActions — entanglement offers ────────────────────────────────────

describe('getLegalActions — entanglement', () => {
  it('offers ENTANGLE actions to empty forward diagonals', () => {
    const s = makeState([{ cell: c(4, 4), player: 0 }]);
    const entangles = getLegalActions(s, R8).filter(a => a.type === 'ENTANGLE');
    const dests = entangles.map(a => (a as { to: number }).to);
    // P0 forward = up: (3,3) and (3,5) — both empty
    expect(dests).toContain(c(3, 3));
    expect(dests).toContain(c(3, 5));
  });

  it('offers both safe and gamble variants per destination', () => {
    const s = makeState([{ cell: c(4, 4), player: 0 }]);
    const toA = getLegalActions(s, R8)
      .filter(a => a.type === 'ENTANGLE' && (a as { to: number }).to === c(3, 3));
    const types = toA.map(a => (a as { pairType: string }).pairType);
    expect(types).toContain('safe');
    expect(types).toContain('gamble');
  });

  it('does not offer ENTANGLE when both pair types are disabled', () => {
    const s = makeState([{ cell: c(4, 4), player: 0 }]);
    const entangles = getLegalActions(s, R_NO_ENTANGLE).filter(a => a.type === 'ENTANGLE');
    expect(entangles).toHaveLength(0);
  });

  it('does not offer ENTANGLE from a ghost piece', () => {
    const s = makeState([], [makePair(c(4, 4), c(3, 3))], 0);
    const entangles = getLegalActions(s, R8).filter(a => a.type === 'ENTANGLE');
    expect(entangles).toHaveLength(0);
  });

  it('ghost pieces cannot make regular moves', () => {
    const s = makeState([], [makePair(c(4, 4), c(3, 3))], 0);
    const moves = getLegalActions(s, R8).filter(a => a.type === 'MOVE');
    expect(moves).toHaveLength(0);
  });

  it('does not offer ENTANGLE when maxSimultaneousPairs limit is reached', () => {
    const existingPair = makePair(c(6, 0), c(5, 1));
    const s = makeState([{ cell: c(4, 4), player: 0 }], [existingPair], 0);
    const entangles = getLegalActions(s, R_MAX1).filter(a => a.type === 'ENTANGLE');
    expect(entangles).toHaveLength(0);
  });

  it('still offers ENTANGLE when below maxSimultaneousPairs limit', () => {
    const R_MAX2: RulesConfig = { ...R8, maxSimultaneousPairs: 2 };
    const existingPair = makePair(c(6, 0), c(5, 1));
    const s = makeState([{ cell: c(4, 4), player: 0 }], [existingPair], 0);
    const entangles = getLegalActions(s, R_MAX2).filter(a => a.type === 'ENTANGLE');
    expect(entangles.length).toBeGreaterThan(0);
  });

  it('king offers ENTANGLE in all 4 diagonal directions', () => {
    const s = makeState([{ cell: c(4, 4), player: 0, isKing: true }]);
    const entangles = getLegalActions(s, R8).filter(a => a.type === 'ENTANGLE');
    const dests = new Set(entangles.map(a => (a as { to: number }).to));
    expect(dests.has(c(3, 3))).toBe(true);  // up-left
    expect(dests.has(c(3, 5))).toBe(true);  // up-right
    expect(dests.has(c(5, 3))).toBe(true);  // down-left
    expect(dests.has(c(5, 5))).toBe(true);  // down-right
  });
});

// ─── applyAction — ENTANGLE ───────────────────────────────────────────────────

describe('applyAction — ENTANGLE', () => {
  const from = c(4, 4);
  const to   = c(3, 3);

  it('converts the piece to ghosts at both cells', () => {
    const s = makeState([{ cell: from, player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    expect(s2.board[from]).toMatchObject({ type: 'ghost', player: 0 });
    expect(s2.board[to  ]).toMatchObject({ type: 'ghost', player: 0 });
  });

  it('both ghost cells share the same pairId', () => {
    const s = makeState([{ cell: from, player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    const gA = s2.board[from] as Extract<typeof s2.board[0], { type: 'ghost' }>;
    const gB = s2.board[to  ] as Extract<typeof s2.board[0], { type: 'ghost' }>;
    expect(gA.pairId).toBe(gB.pairId);
  });

  it('creates exactly one pair with correct properties', () => {
    const s = makeState([{ cell: from, player: 0 }]);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'gamble' }, noop, R8);
    expect(s2.pairs).toHaveLength(1);
    expect(s2.pairs[0]).toMatchObject({
      pairType: 'gamble',
      cellA: from, cellB: to,
      owner: 0,
      turnsRemaining: R8.entanglementCountdown,
    });
  });

  it('emits PAIR_CREATED event with correct fields', () => {
    const s = makeState([{ cell: from, player: 0 }]);
    const { events } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    const ev = events.find(e => e.type === 'PAIR_CREATED');
    expect(ev).toBeDefined();
    expect(ev).toMatchObject({ cellA: from, cellB: to, pairType: 'safe' });
  });

  it('costs the turn — switches to opponent', () => {
    const s = makeState([{ cell: from, player: 0 }], [], 0);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    expect(s2.turn).toBe(1);
    expect(s2.moveNumber).toBe(1);
  });

  it('does not mutate original state', () => {
    const s = makeState([{ cell: from, player: 0 }]);
    applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    expect(s.board[from].type).toBe('piece');
    expect(s.pairs).toHaveLength(0);
  });

  it('preserves isKing flag in ghost', () => {
    const s = makeState([{ cell: from, player: 0, isKing: true }]);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from, to, pairType: 'safe' }, noop, R8);
    expect((s2.board[from] as { isKing: boolean }).isKing).toBe(true);
    expect((s2.board[to  ] as { isKing: boolean }).isKing).toBe(true);
  });
});

// ─── Countdown behaviour ──────────────────────────────────────────────────────

describe('countdown', () => {
  it('countdown does not tick on the turn the pair is created', () => {
    // P0 creates pair; check that pair still has full countdown
    const s = makeState([{ cell: c(4, 4), player: 0 }, { cell: c(6, 0), player: 1 }]);
    const { state: s2 } = applyAction(s, { type: 'ENTANGLE', from: c(4, 4), to: c(3, 3), pairType: 'safe' }, noop, R8);
    expect(s2.pairs[0].turnsRemaining).toBe(R8.entanglementCountdown);
  });

  it('countdown decrements by 1 after each subsequent turn', () => {
    // P0 creates pair (countdown=3), then P1 makes a move — countdown should become 2
    const s = makeState([
      { cell: c(4, 4), player: 0 },
      { cell: c(2, 2), player: 1 },
    ]);
    const { state: s1 } = applyAction(s,  { type: 'ENTANGLE', from: c(4, 4), to: c(3, 3), pairType: 'safe' }, noop, R8);
    expect(s1.pairs[0].turnsRemaining).toBe(3);  // not ticked yet

    // P1 moves
    const { state: s2 } = applyAction(s1, { type: 'MOVE', from: c(2, 2), to: c(3, 1) }, noop, R8);
    expect(s2.pairs[0].turnsRemaining).toBe(2);

    // P0's turn — moves a different piece (pair countdown ticks again)
    const s3base = { ...s2, board: s2.board.map((c_: CellState) => ({ ...c_ })) };
    // Place a spare P0 piece to move
    s3base.board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    const { state: s3 } = applyAction(s3base, { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, noop, R8);
    expect(s3.pairs[0].turnsRemaining).toBe(1);
  });

  it('countdown expiry triggers collapse and removes the pair', () => {
    // Build a state where a pair has turnsRemaining=1 and it is P1's turn to move
    const pair = makePair(c(4, 4), c(3, 3), 'safe', 0, 1);
    const s = makeState([{ cell: c(2, 2), player: 1 }], [pair], 1);
    const { state: s2, events } = applyAction(s, { type: 'MOVE', from: c(2, 2), to: c(3, 1) }, noop, R8);
    expect(s2.pairs).toHaveLength(0);
    expect(events.some(e => e.type === 'COLLAPSE_TRIGGERED')).toBe(true);
    expect(events.some(e => e.type === 'COLLAPSE_RESOLVED')).toBe(true);
  });

  it('emits PAIR_COUNTDOWN_TICK events for pairs still alive', () => {
    const pair = makePair(c(4, 4), c(3, 3), 'safe', 0, 3);
    const s = makeState([{ cell: c(2, 2), player: 1 }], [pair], 1);
    const { events } = applyAction(s, { type: 'MOVE', from: c(2, 2), to: c(3, 1) }, noop, R8);
    expect(events.some(e => e.type === 'PAIR_COUNTDOWN_TICK')).toBe(true);
  });
});
