import { describe, it, expect } from 'vitest';
import { applyAction } from '../RulesEngine';
import type { GameState, CellState, Player, PairType, EntanglementPair } from '../types';
import { RULES_STANDARD } from '@config/rules.standard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function c(row: number, col: number, size = 8): number { return row * size + col; }

const rng = (val: number) => ({ next: () => val });
const BELOW_HALF = rng(0.3);  // triggers safe_a / gamble_win
const ABOVE_HALF = rng(0.7);  // triggers safe_b / gamble_lose

function makeState(
  pieces: { cell: number; player: Player; isKing?: boolean }[],
  pairs: EntanglementPair[] = [],
  turn: Player = 0,
): GameState {
  const board: CellState[] = Array.from({ length: 64 }, () => ({ type: 'empty' as const }));
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
  id = 'p0',
): EntanglementPair {
  return { id, pairType, cellA, cellB, owner, turnsRemaining };
}

const R = RULES_STANDARD;

// ─── Safe pair collapse outcomes ─────────────────────────────────────────────

describe('safe pair — collapse outcomes', () => {
  const cellA = c(4, 4);
  const cellB = c(3, 3);

  function stateWithSpare(turns = 1): GameState {
    const s = makeState([], [makePair(cellA, cellB, 'safe', 0, turns)], 0);
    const board = s.board.map(c_ => ({ ...c_ }));
    board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    return { ...s, board };
  }

  it('safe_a: rng < 0.5 → piece appears at cellA, cellB becomes empty', () => {
    const { state: s2 } = applyAction(stateWithSpare(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    expect(s2.board[cellA]).toMatchObject({ type: 'piece', player: 0 });
    expect(s2.board[cellB]).toMatchObject({ type: 'empty' });
  });

  it('safe_b: rng >= 0.5 → piece appears at cellB, cellA becomes empty', () => {
    const { state: s2 } = applyAction(stateWithSpare(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    expect(s2.board[cellA]).toMatchObject({ type: 'empty' });
    expect(s2.board[cellB]).toMatchObject({ type: 'piece', player: 0 });
  });

  it('safe_a emits outcome=safe_a, survivingCell=cellA', () => {
    const { events } = applyAction(stateWithSpare(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    const resolved = events.find(e => e.type === 'COLLAPSE_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'safe_a', survivingCell: cellA });
  });

  it('safe_b emits outcome=safe_b, survivingCell=cellB', () => {
    const { events } = applyAction(stateWithSpare(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    const resolved = events.find(e => e.type === 'COLLAPSE_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'safe_b', survivingCell: cellB });
  });

  it('pair is removed from state after collapse', () => {
    const { state: s2 } = applyAction(stateWithSpare(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    expect(s2.pairs).toHaveLength(0);
  });
});

// ─── Gamble pair collapse outcomes ───────────────────────────────────────────

describe('gamble pair — collapse outcomes', () => {
  const cellA = c(4, 4);
  const cellB = c(3, 3);

  function gambleState(): GameState {
    const s = makeState([], [makePair(cellA, cellB, 'gamble', 0, 1)], 0);
    const board = s.board.map(c_ => ({ ...c_ }));
    board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    return { ...s, board };
  }

  it('gamble_win: rng < 0.5 → both cells have pieces', () => {
    const { state: s2 } = applyAction(gambleState(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    expect(s2.board[cellA]).toMatchObject({ type: 'piece', player: 0 });
    expect(s2.board[cellB]).toMatchObject({ type: 'piece', player: 0 });
  });

  it('gamble_lose: rng >= 0.5 → both cells are empty', () => {
    const { state: s2 } = applyAction(gambleState(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    expect(s2.board[cellA]).toMatchObject({ type: 'empty' });
    expect(s2.board[cellB]).toMatchObject({ type: 'empty' });
  });

  it('gamble_win emits outcome=gamble_win, survivingCell=null', () => {
    const { events } = applyAction(gambleState(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    const resolved = events.find(e => e.type === 'COLLAPSE_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'gamble_win', survivingCell: null });
  });

  it('gamble_lose emits outcome=gamble_lose, survivingCell=null', () => {
    const { events } = applyAction(gambleState(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    const resolved = events.find(e => e.type === 'COLLAPSE_RESOLVED');
    expect(resolved).toMatchObject({ outcome: 'gamble_lose', survivingCell: null });
  });

  it('pair is removed after gamble collapse', () => {
    const { state: s2 } = applyAction(gambleState(), { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    expect(s2.pairs).toHaveLength(0);
  });
});

// ─── Trigger: enemy attack on ghost ──────────────────────────────────────────

describe('collapse trigger: enemy attacks ghost', () => {
  // P1 piece at (3,5) attacks diagonally to (5,3), jumping over P0 ghost at (4,4).
  // P0 ghost pair: cellA=(4,4), cellB=(3,3).
  const ghostA   = c(4, 4);
  const ghostB   = c(3, 3);
  const attacker = c(3, 5);
  const landing  = c(5, 3);

  function setupAttackOnGhost(): GameState {
    const pair = makePair(ghostA, ghostB, 'safe', 0, 3);
    return makeState([{ cell: attacker, player: 1 }], [pair], 1);
  }

  it('attacking a ghost emits COLLAPSE_TRIGGERED with trigger=attack', () => {
    const { events } = applyAction(setupAttackOnGhost(), { type: 'CAPTURE', from: attacker, to: landing, via: ghostA }, BELOW_HALF, R);
    expect(events.some(e => e.type === 'COLLAPSE_TRIGGERED' && (e as { trigger: string }).trigger === 'attack')).toBe(true);
  });

  it('safe_a: piece collapses to ghostA (=via), attacker captures and lands', () => {
    const { state: s2 } = applyAction(setupAttackOnGhost(), { type: 'CAPTURE', from: attacker, to: landing, via: ghostA }, BELOW_HALF, R);
    expect(s2.board[ghostA]).toMatchObject({ type: 'empty' });          // captured
    expect(s2.board[landing]).toMatchObject({ type: 'piece', player: 1 }); // attacker landed
    expect(s2.board[ghostB]).toMatchObject({ type: 'empty' });          // pair dissolved
    expect(s2.pairs).toHaveLength(0);
  });

  it('safe_b: piece evades to ghostB, attacker steps to via instead of landing', () => {
    const { state: s2 } = applyAction(setupAttackOnGhost(), { type: 'CAPTURE', from: attacker, to: landing, via: ghostA }, ABOVE_HALF, R);
    expect(s2.board[ghostB]).toMatchObject({ type: 'piece', player: 0 });   // survived at cellB
    expect(s2.board[ghostA]).toMatchObject({ type: 'piece', player: 1 });   // attacker stepped to via
    expect(s2.board[landing]).toMatchObject({ type: 'empty' });             // attacker did not land
    expect(s2.pairs).toHaveLength(0);
  });

  it('pair is always removed after an attack-triggered collapse', () => {
    for (const r of [BELOW_HALF, ABOVE_HALF]) {
      const { state: s2 } = applyAction(setupAttackOnGhost(), { type: 'CAPTURE', from: attacker, to: landing, via: ghostA }, r, R);
      expect(s2.pairs).toHaveLength(0);
    }
  });
});

// ─── Trigger: own-piece attacks ghost (own_attack) ───────────────────────────

describe('collapse trigger: attacker is own ghost (own_attack)', () => {
  // P0 moves UP (dr=-1). Ghost at ghostB=(4,4) captures forward-left:
  // via target=P1 piece at (3,3), landing at (2,2).
  // Pair: cellA=(5,5), cellB=(4,4).
  const ghostA  = c(5, 5);
  const ghostB  = c(4, 4);
  const target  = c(3, 3);
  const landing = c(2, 2);

  function setupOwnAttack(): GameState {
    const pair = makePair(ghostA, ghostB, 'safe', 0, 3);
    return makeState([{ cell: target, player: 1 }], [pair], 0);
  }

  it('own ghost attacking emits COLLAPSE_TRIGGERED with trigger=own_attack', () => {
    const { events } = applyAction(setupOwnAttack(), { type: 'CAPTURE', from: ghostB, to: landing, via: target }, BELOW_HALF, R);
    expect(events.some(e => e.type === 'COLLAPSE_TRIGGERED' && (e as { trigger: string }).trigger === 'own_attack')).toBe(true);
  });

  it('safe_a (collapses to ghostA=cellA): ghost-attacker evaporates at from, target is NOT captured', () => {
    // rng<0.5 → safe_a: piece collapses to cellA=(5,5). ghostB=(4,4) becomes empty.
    const { state: s2 } = applyAction(setupOwnAttack(), { type: 'CAPTURE', from: ghostB, to: landing, via: target }, BELOW_HALF, R);
    expect(s2.board[ghostA]).toMatchObject({ type: 'piece', player: 0 });  // survived at cellA
    expect(s2.board[ghostB]).toMatchObject({ type: 'empty' });             // from-cell empty
    expect(s2.board[target]).toMatchObject({ type: 'piece', player: 1 });  // not captured
    expect(s2.pairs).toHaveLength(0);
  });

  it('safe_b (collapses to ghostB=from=cellB): attacker is real, capture proceeds', () => {
    // rng>=0.5 → safe_b: piece at cellB=(4,4) (=from). Attacker is real.
    const { state: s2 } = applyAction(setupOwnAttack(), { type: 'CAPTURE', from: ghostB, to: landing, via: target }, ABOVE_HALF, R);
    expect(s2.board[landing]).toMatchObject({ type: 'piece', player: 0 }); // landed at (2,2)
    expect(s2.board[target]).toMatchObject({ type: 'empty' });             // P1 piece captured
    expect(s2.pairs).toHaveLength(0);
  });
});

// ─── Event ordering ───────────────────────────────────────────────────────────

describe('collapse event ordering', () => {
  it('COLLAPSE_TRIGGERED appears before COLLAPSE_RESOLVED', () => {
    const pair = makePair(c(4, 4), c(3, 3), 'safe', 0, 1);
    const board: CellState[] = Array.from({ length: 64 }, () => ({ type: 'empty' as const }));
    board[c(4, 4)] = { type: 'ghost', pairId: 'p0', player: 0, isKing: false };
    board[c(3, 3)] = { type: 'ghost', pairId: 'p0', player: 0, isKing: false };
    board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    const s: GameState = {
      board, pairs: [pair], turn: 0, moveNumber: 0,
      captured: [0, 0], phase: 'playing', winner: null,
      pendingCapture: null, pairCounter: 1,
    };
    const { events } = applyAction(s, { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    const ti = events.findIndex(e => e.type === 'COLLAPSE_TRIGGERED');
    const ri = events.findIndex(e => e.type === 'COLLAPSE_RESOLVED');
    expect(ti).toBeGreaterThanOrEqual(0);
    expect(ri).toBeGreaterThan(ti);
  });

  it('all collapse events carry the correct pairId', () => {
    const pair = makePair(c(4, 4), c(3, 3), 'safe', 0, 1, 'my-pair');
    const board: CellState[] = Array.from({ length: 64 }, () => ({ type: 'empty' as const }));
    board[c(4, 4)] = { type: 'ghost', pairId: 'my-pair', player: 0, isKing: false };
    board[c(3, 3)] = { type: 'ghost', pairId: 'my-pair', player: 0, isKing: false };
    board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    const s: GameState = {
      board, pairs: [pair], turn: 0, moveNumber: 0,
      captured: [0, 0], phase: 'playing', winner: null,
      pendingCapture: null, pairCounter: 1,
    };
    const { events } = applyAction(s, { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, BELOW_HALF, R);
    for (const ev of events) {
      if ('pairId' in ev) expect((ev as { pairId: string }).pairId).toBe('my-pair');
    }
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('collapse immutability', () => {
  it('applyAction does not mutate the input state during collapse', () => {
    const pair = makePair(c(4, 4), c(3, 3), 'gamble', 0, 1);
    const s = makeState([], [pair], 0);
    const board = s.board.map(c_ => ({ ...c_ }));
    board[c(7, 7)] = { type: 'piece', player: 0, isKing: false };
    const s2 = { ...s, board };
    const origCellA = { ...s2.board[c(4, 4)] };
    const origPairs = s2.pairs.length;
    applyAction(s2, { type: 'MOVE', from: c(7, 7), to: c(6, 6) }, ABOVE_HALF, R);
    expect(s2.board[c(4, 4)]).toEqual(origCellA);
    expect(s2.pairs).toHaveLength(origPairs);
  });
});
