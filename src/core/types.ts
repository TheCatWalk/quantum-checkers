// ─── Primitives ───────────────────────────────────────────────────────────────

export type Player = 0 | 1;
export type PairType = 'safe' | 'gamble';

// Injected RNG interface — core never imports the concrete RNG class from services.
export interface IRNG {
  next(): number;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export type CellState =
  | { type: 'empty' }
  | { type: 'piece'; player: Player; isKing: boolean }
  | { type: 'ghost'; pairId: string; player: Player; isKing: boolean };

// ─── Entanglement ─────────────────────────────────────────────────────────────

export interface EntanglementPair {
  id: string;
  pairType: PairType;
  cellA: number;
  cellB: number;
  owner: Player;
  turnsRemaining: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  board: CellState[];
  pairs: EntanglementPair[];
  turn: Player;
  moveNumber: number;
  captured: [number, number];
  phase: 'playing' | 'collapsing' | 'game_over';
  winner: Player | null;
  // Non-null during a multi-jump sequence: the cell index of the piece mid-jump.
  pendingCapture: number | null;
  // Monotonic counter used to generate unique pair IDs within a game.
  pairCounter: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'MOVE';     from: number; to: number }
  | { type: 'CAPTURE';  from: number; to: number; via: number }
  | { type: 'ENTANGLE'; from: number; to: number; pairType: PairType }
  | { type: 'FORFEIT' };

// ─── Game Events (emitted by applyAction; consumed by UI for animation) ───────

export type CollapseOutcome = 'safe_a' | 'safe_b' | 'gamble_win' | 'gamble_lose';
export type CollapseTrigger = 'attack' | 'countdown' | 'own_attack';

export type GameEvent =
  | { type: 'PIECE_MOVED';         from: number; to: number }
  | { type: 'PIECE_CAPTURED';      cell: number; player: Player }
  | { type: 'KING_CROWNED';        cell: number }
  | { type: 'PAIR_CREATED';        pairId: string; pairType: PairType; cellA: number; cellB: number }
  | { type: 'PAIR_COUNTDOWN_TICK'; pairId: string; remaining: number }
  | { type: 'COLLAPSE_TRIGGERED';  pairId: string; trigger: CollapseTrigger }
  | { type: 'COLLAPSE_RESOLVED';   pairId: string; outcome: CollapseOutcome; survivingCell: number | null }
  | { type: 'GAME_OVER';           winner: Player | null };

// ─── Engine output ────────────────────────────────────────────────────────────

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

