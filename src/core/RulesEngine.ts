import type {
  GameState, CellState, Action, ApplyResult,
  GameEvent, IRNG, Player, EntanglementPair,
  CollapseOutcome, CollapseTrigger,
} from './types';
import type { RulesConfig } from '@config/types';

// ─── Board geometry ───────────────────────────────────────────────────────────

function toRC(cell: number, size: number): [number, number] {
  return [Math.floor(cell / size), cell % size];
}

function toCell(row: number, col: number, size: number): number {
  return row * size + col;
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

// Playable squares: (row + col) % 2 === 0
function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

// Player 0 starts at bottom (high rows), moves UP (decreasing row).
// Player 1 starts at top  (low  rows), moves DOWN (increasing row).
const FORWARD_DR: Record<Player, number> = { 0: -1, 1: 1 };
const ALL_DIRS:   [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function forwardDirs(player: Player): [number, number][] {
  const dr = FORWARD_DR[player];
  return [[dr, -1], [dr, 1]];
}

function promotionRow(player: Player, size: number): number {
  return player === 0 ? 0 : size - 1;
}

// ─── State creation ───────────────────────────────────────────────────────────

export function createInitialState(rules: RulesConfig): GameState {
  const { boardSize: size, rowsPerPlayer } = rules;
  const board: CellState[] = Array.from({ length: size * size }, () => ({ type: 'empty' as const }));

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isDark(row, col)) continue;
      if (row < rowsPerPlayer) {
        board[toCell(row, col, size)] = { type: 'piece', player: 1, isKing: false };
      } else if (row >= size - rowsPerPlayer) {
        board[toCell(row, col, size)] = { type: 'piece', player: 0, isKing: false };
      }
    }
  }

  return {
    board, pairs: [], turn: 0, moveNumber: 0,
    captured: [0, 0], phase: 'playing', winner: null,
    pendingCapture: null, pairCounter: 0,
  };
}

// ─── Legal action generation ───────────────────────────────────────────────────

type GhostCell  = Extract<CellState, { type: 'ghost' }>;
type PieceCell  = Extract<CellState, { type: 'piece' }>;

function capturesFrom(board: CellState[], cell: number, size: number): Action[] {
  const c = board[cell];
  if (c.type === 'empty') return [];
  const { player, isKing } = c as PieceCell | GhostCell;
  const dirs = isKing ? ALL_DIRS : forwardDirs(player);
  const results: Action[] = [];

  for (const [dr, dc] of dirs) {
    const [r, col] = toRC(cell, size);
    const mr = r + dr;   const mc = col + dc;
    const lr = r + dr * 2; const lc = col + dc * 2;
    if (!inBounds(mr, mc, size) || !inBounds(lr, lc, size)) continue;

    const mid  = toCell(mr, mc, size);
    const land = toCell(lr, lc, size);
    const midCell = board[mid];

    const isOpponent = midCell.type !== 'empty' && (midCell as PieceCell | GhostCell).player !== player;
    if (isOpponent && board[land].type === 'empty') {
      results.push({ type: 'CAPTURE', from: cell, to: land, via: mid });
    }
  }
  return results;
}

function movesFrom(board: CellState[], cell: number, size: number): Action[] {
  const c = board[cell];
  if (c.type !== 'piece') return [];
  const dirs = c.isKing ? ALL_DIRS : forwardDirs(c.player);
  const [r, col] = toRC(cell, size);
  const results: Action[] = [];

  for (const [dr, dc] of dirs) {
    const nr = r + dr; const nc = col + dc;
    if (!inBounds(nr, nc, size)) continue;
    const dest = toCell(nr, nc, size);
    if (board[dest].type === 'empty') {
      results.push({ type: 'MOVE', from: cell, to: dest });
    }
  }
  return results;
}

function entanglesFrom(
  board: CellState[], cell: number, size: number, rules: RulesConfig,
): Action[] {
  const c = board[cell];
  if (c.type !== 'piece') return [];
  const dirs = c.isKing ? ALL_DIRS : forwardDirs(c.player);
  const [r, col] = toRC(cell, size);
  const results: Action[] = [];

  for (const [dr, dc] of dirs) {
    const nr = r + dr; const nc = col + dc;
    if (!inBounds(nr, nc, size)) continue;
    const dest = toCell(nr, nc, size);
    if (board[dest].type !== 'empty') continue;
    if (rules.safePairsEnabled)   results.push({ type: 'ENTANGLE', from: cell, to: dest, pairType: 'safe' });
    if (rules.gamblePairsEnabled) results.push({ type: 'ENTANGLE', from: cell, to: dest, pairType: 'gamble' });
  }
  return results;
}

export function getLegalActions(state: GameState, rules: RulesConfig): Action[] {
  if (state.phase !== 'playing') return [];

  const { board, turn, pendingCapture } = state;
  const size = rules.boardSize;

  if (pendingCapture !== null) {
    return capturesFrom(board, pendingCapture, size);
  }

  const allCaptures:  Action[] = [];
  const allMoves:     Action[] = [];
  const allEntangles: Action[] = [];

  const entangleOk =
    (rules.safePairsEnabled || rules.gamblePairsEnabled) &&
    (rules.maxSimultaneousPairs === -1 || state.pairs.length < rules.maxSimultaneousPairs);

  for (let cell = 0; cell < board.length; cell++) {
    const c = board[cell];
    if (c.type === 'empty' || (c as PieceCell | GhostCell).player !== turn) continue;
    allCaptures.push(...capturesFrom(board, cell, size));
    if (c.type === 'piece') {
      allMoves.push(...movesFrom(board, cell, size));
      if (entangleOk) allEntangles.push(...entanglesFrom(board, cell, size, rules));
    }
  }

  if (rules.forcedCaptures && allCaptures.length > 0) return allCaptures;
  return allCaptures.length > 0
    ? [...allCaptures, ...allMoves, ...allEntangles]
    : [...allMoves, ...allEntangles];
}

// ─── Immutable-style cloning ───────────────────────────────────────────────────

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board:    state.board.map(c => ({ ...c })),
    pairs:    state.pairs.map(p => ({ ...p })),
    captured: [state.captured[0], state.captured[1]],
  };
}

// ─── Promotion ────────────────────────────────────────────────────────────────

function tryPromote(board: CellState[], cell: number, size: number): boolean {
  const c = board[cell];
  if (c.type !== 'piece' || c.isKing) return false;
  if (toRC(cell, size)[0] !== promotionRow(c.player, size)) return false;
  board[cell] = { ...c, isKing: true };
  return true;
}

// ─── Collapse ─────────────────────────────────────────────────────────────────

function collapseOne(
  board: CellState[],
  pair: EntanglementPair,
  rng: IRNG,
): { outcome: CollapseOutcome; survivingCell: number | null } {
  const roll = rng.next();
  const ghost = (board[pair.cellA].type === 'ghost'
    ? board[pair.cellA]
    : board[pair.cellB]) as GhostCell;
  const props = { player: ghost.player, isKing: ghost.isKing };

  if (pair.pairType === 'safe') {
    if (roll < 0.5) {
      board[pair.cellA] = { type: 'piece', ...props };
      board[pair.cellB] = { type: 'empty' };
      return { outcome: 'safe_a', survivingCell: pair.cellA };
    }
    board[pair.cellA] = { type: 'empty' };
    board[pair.cellB] = { type: 'piece', ...props };
    return { outcome: 'safe_b', survivingCell: pair.cellB };
  }

  // gamble
  if (roll < 0.5) {
    board[pair.cellA] = { type: 'piece', ...props };
    board[pair.cellB] = { type: 'piece', ...props };
    return { outcome: 'gamble_win', survivingCell: null };  // both cells survive, no single cell
  }
  board[pair.cellA] = { type: 'empty' };
  board[pair.cellB] = { type: 'empty' };
  return { outcome: 'gamble_lose', survivingCell: null };
}

// Collapse a pair and emit events. Mutates the cloned state in-place.
function triggerCollapse(
  s: GameState,
  pair: EntanglementPair,
  rng: IRNG,
  trigger: CollapseTrigger,
): GameEvent[] {
  const events: GameEvent[] = [{ type: 'COLLAPSE_TRIGGERED', pairId: pair.id, trigger }];
  const { outcome, survivingCell } = collapseOne(s.board, pair, rng);
  s.pairs = s.pairs.filter(p => p.id !== pair.id);
  events.push({ type: 'COLLAPSE_RESOLVED', pairId: pair.id, outcome, survivingCell });
  return events;
}

// ─── Countdown tick ───────────────────────────────────────────────────────────

// Called after every full turn (when turn switches and moveNumber increments).
function tickCountdowns(s: GameState, rng: IRNG, rules: RulesConfig): GameEvent[] {
  if (!rules.collapseTriggers.onCountdown) return [];

  const events: GameEvent[] = [];
  const toCollapse: EntanglementPair[] = [];

  for (const pair of s.pairs) {
    pair.turnsRemaining -= 1;
    if (pair.turnsRemaining <= 0) {
      toCollapse.push(pair);
    } else {
      events.push({ type: 'PAIR_COUNTDOWN_TICK', pairId: pair.id, remaining: pair.turnsRemaining });
    }
  }

  for (const pair of toCollapse) {
    events.push(...triggerCollapse(s, pair, rng, 'countdown'));
  }
  return events;
}

// ─── Game-over detection ──────────────────────────────────────────────────────

function resolveGameOver(state: GameState, rules: RulesConfig): GameEvent | null {
  const hasP0 = state.board.some(c => c.type !== 'empty' && (c as PieceCell | GhostCell).player === 0);
  const hasP1 = state.board.some(c => c.type !== 'empty' && (c as PieceCell | GhostCell).player === 1);

  if (!hasP0) { state.phase = 'game_over'; state.winner = 1; return { type: 'GAME_OVER', winner: 1 }; }
  if (!hasP1) { state.phase = 'game_over'; state.winner = 0; return { type: 'GAME_OVER', winner: 0 }; }

  if (getLegalActions(state, rules).length === 0) {
    const winner = (state.turn === 0 ? 1 : 0) as Player;
    state.phase = 'game_over';
    state.winner = winner;
    return { type: 'GAME_OVER', winner };
  }
  return null;
}

// ─── Turn-end helper ──────────────────────────────────────────────────────────

function endTurn(s: GameState, rng: IRNG, rules: RulesConfig): GameEvent[] {
  s.pendingCapture = null;
  s.turn = (s.turn === 0 ? 1 : 0) as Player;
  s.moveNumber += 1;
  return tickCountdowns(s, rng, rules);
}

// ─── applyAction (public entry point) ────────────────────────────────────────

export function applyAction(
  state: GameState,
  action: Action,
  rng: IRNG,
  rules: RulesConfig,
): ApplyResult {
  switch (action.type) {
    case 'MOVE':     return applyMove(state, action, rng, rules);
    case 'CAPTURE':  return applyCapture(state, action, rng, rules);
    case 'ENTANGLE': return applyEntangle(state, action, rng, rules);
    case 'FORFEIT':  return applyForfeit(state);
    default: {
      const _: never = action;
      throw new Error(`Unknown action type: ${JSON.stringify(_)}`);
    }
  }
}

// ─── MOVE ─────────────────────────────────────────────────────────────────────

function applyMove(
  state: GameState,
  action: Extract<Action, { type: 'MOVE' }>,
  rng: IRNG,
  rules: RulesConfig,
): ApplyResult {
  const s = cloneState(state);
  const events: GameEvent[] = [];
  const { from, to } = action;

  s.board[to]   = s.board[from];
  s.board[from] = { type: 'empty' };
  events.push({ type: 'PIECE_MOVED', from, to });

  if (tryPromote(s.board, to, rules.boardSize)) {
    events.push({ type: 'KING_CROWNED', cell: to });
  }

  events.push(...endTurn(s, rng, rules));
  const overEvent = resolveGameOver(s, rules);
  if (overEvent) events.push(overEvent);
  return { state: s, events };
}

// ─── CAPTURE ──────────────────────────────────────────────────────────────────

function applyCapture(
  state: GameState,
  action: Extract<Action, { type: 'CAPTURE' }>,
  rng: IRNG,
  rules: RulesConfig,
): ApplyResult {
  const s = cloneState(state);
  const events: GameEvent[] = [];
  const { from, to, via } = action;

  // ── 1. Collapse the attacker if it is itself a ghost ──────────────────────
  if (s.board[from].type === 'ghost' && rules.collapseTriggers.onOwnAttack) {
    const ownGhost = s.board[from] as GhostCell;
    const ownPair  = s.pairs.find(p => p.id === ownGhost.pairId);
    if (ownPair) events.push(...triggerCollapse(s, ownPair, rng, 'own_attack'));

    // Re-read after mutation: triggerCollapse may have changed ghost → empty or piece.
    if ((s.board[from] as CellState).type === 'empty') {
      // Piece evaded: attacker wasn't actually there — cancel and end turn
      events.push(...endTurn(s, rng, rules));
      const ov = resolveGameOver(s, rules);
      if (ov) events.push(ov);
      return { state: s, events };
    }
  }

  // ── 2. Collapse the target if it is a ghost ───────────────────────────────
  if (s.board[via].type === 'ghost' && rules.collapseTriggers.onAttack) {
    const tgtGhost = s.board[via] as GhostCell;
    const tgtPair  = s.pairs.find(p => p.id === tgtGhost.pairId);
    if (tgtPair) events.push(...triggerCollapse(s, tgtPair, rng, 'attack'));

    // Re-read after mutation: triggerCollapse may have changed ghost → empty or piece.
    const viaEmpty = (s.board[via] as CellState).type === 'empty';
    const toLanded = s.board[to].type !== 'empty';

    if (viaEmpty || toLanded) {
      // Ghost evaded OR landing is occupied: step attacker into the vacated via square
      if (viaEmpty) {
        s.board[via]  = s.board[from];
        s.board[from] = { type: 'empty' };
        events.push({ type: 'PIECE_MOVED', from, to: via });
        if (tryPromote(s.board, via, rules.boardSize)) {
          events.push({ type: 'KING_CROWNED', cell: via });
        }
      }
      // If via is still occupied (gamble_win filled both squares), attacker stays put
      events.push(...endTurn(s, rng, rules));
      const ov = resolveGameOver(s, rules);
      if (ov) events.push(ov);
      return { state: s, events };
    }
  }

  // ── 3. Normal capture ─────────────────────────────────────────────────────
  const captured = s.board[via];
  if (captured.type === 'empty') throw new Error('Invalid capture: via cell is empty');

  s.captured[(captured as PieceCell | GhostCell).player] += 1;
  s.board[to]   = s.board[from];
  s.board[from] = { type: 'empty' };
  s.board[via]  = { type: 'empty' };

  events.push({ type: 'PIECE_MOVED',    from, to });
  events.push({ type: 'PIECE_CAPTURED', cell: via, player: (captured as PieceCell | GhostCell).player });

  const promoted = tryPromote(s.board, to, rules.boardSize);
  if (promoted) events.push({ type: 'KING_CROWNED', cell: to });

  const continuations = promoted ? [] : capturesFrom(s.board, to, rules.boardSize);
  if (continuations.length > 0) {
    s.pendingCapture = to;
  } else {
    events.push(...endTurn(s, rng, rules));
  }

  const overEvent = resolveGameOver(s, rules);
  if (overEvent) events.push(overEvent);
  return { state: s, events };
}

// ─── ENTANGLE ─────────────────────────────────────────────────────────────────

function applyEntangle(
  state: GameState,
  action: Extract<Action, { type: 'ENTANGLE' }>,
  _rng: IRNG,
  rules: RulesConfig,
): ApplyResult {
  const s = cloneState(state);
  const events: GameEvent[] = [];
  const { from, to, pairType } = action;

  const piece = s.board[from] as PieceCell;
  const pairId = `p${s.pairCounter}`;
  s.pairCounter += 1;

  const pair: EntanglementPair = {
    id: pairId, pairType,
    cellA: from, cellB: to,
    owner: piece.player,
    turnsRemaining: rules.entanglementCountdown,
  };

  s.board[from] = { type: 'ghost', pairId, player: piece.player, isKing: piece.isKing };
  s.board[to]   = { type: 'ghost', pairId, player: piece.player, isKing: piece.isKing };
  s.pairs.push(pair);

  events.push({ type: 'PAIR_CREATED', pairId, pairType, cellA: from, cellB: to });

  // Note: no tickCountdowns here — the pair was just created on this turn.
  // Countdowns first tick when the NEXT turn ends.
  s.pendingCapture = null;
  s.turn = (s.turn === 0 ? 1 : 0) as Player;
  s.moveNumber += 1;

  const overEvent = resolveGameOver(s, rules);
  if (overEvent) events.push(overEvent);
  return { state: s, events };
}

// ─── FORFEIT ──────────────────────────────────────────────────────────────────

function applyForfeit(state: GameState): ApplyResult {
  const s = cloneState(state);
  s.phase  = 'game_over';
  s.winner = (s.turn === 0 ? 1 : 0) as Player;
  return { state: s, events: [{ type: 'GAME_OVER', winner: s.winner }] };
}
