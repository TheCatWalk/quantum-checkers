# Quantum Checkers — Design Guidelines

> **This document is law.** Every new file, scene, and system must conform to it.
> When you're unsure how to structure something, the answer is in here.
> When this document is insufficient, update it *before* writing the code.

---

## 1. Platform & Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict mode) | Type safety enforces core/shell boundary at compile time |
| Renderer | Phaser 3 | First-class tweens, particles, tilemaps, cameras; no build-your-own |
| Build tool | Vite | Instant HMR, zero-config TS, trivial static export |
| Testing | Vitest | Same config as Vite; fast, native ESM |
| Package manager | npm | Standard; lock file committed |
| Deploy/demo | `vite build` → static HTML | Open `dist/index.html` in any browser; no server needed |

No framework (React, Vue, etc.) is used. Phaser owns the DOM.

---

## 2. The One Rule That Governs Everything

> **Game logic never knows the renderer exists. The renderer never invents rules.**

This is the core/shell pattern enforced throughout the codebase. Break it and the project becomes unmaintainable.

---

## 3. Folder Structure

```
quantum-checkers/
├── DESIGN_GUIDELINES.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── main.ts                   ← Phaser game bootstrap only
│   ├── core/                     ← pure TS logic — ZERO Phaser imports, ever
│   │   ├── types.ts              ← all shared types/enums (GameState, Action, GameEvent, etc.)
│   │   ├── RulesEngine.ts        ← getLegalActions(), applyAction()
│   │   ├── EntanglementPair.ts   ← pair data + collapse logic
│   │   └── __tests__/
│   │       ├── movement.test.ts
│   │       ├── entanglement.test.ts
│   │       └── collapse.test.ts
│   ├── config/
│   │   ├── rules.event.ts        ← 6×6, short games for event booth
│   │   ├── rules.standard.ts     ← full 8×8
│   │   ├── rules.advanced.ts     ← advanced quantum interactions
│   │   └── theme.ts              ← ALL visual constants (colors, sizes, durations)
│   ├── services/                 ← singletons wired at startup; no Phaser dependency
│   │   ├── EventBus.ts           ← typed mitt-based event bus
│   │   ├── GameManager.ts        ← owns GameState, drives RulesEngine
│   │   └── RNG.ts                ← seeded PRNG; only file that calls Math.random()
│   └── ui/                       ← Phaser scenes and game objects; no game logic here
│       ├── scenes/
│       │   ├── BootScene.ts      ← asset preload only
│       │   ├── MenuScene.ts
│       │   ├── GameScene.ts      ← board + pieces; translates clicks → Actions
│       │   └── GameOverScene.ts
│       ├── objects/
│       │   ├── BoardRenderer.ts  ← draws squares, highlights legal moves
│       │   ├── PieceSprite.ts    ← classical piece; handles move tween
│       │   ├── GhostPiece.ts     ← superposed half; pulse shader + alpha
│       │   ├── EntangleLink.ts   ← glowing line between ghost pair
│       │   ├── CollapseEffect.ts ← particle burst + screen pause + result reveal
│       │   └── HUD.ts            ← turn indicator, captured counts, countdown pips
│       └── shaders/
│           ├── ghost.glsl
│           └── link.glsl
└── public/
    └── assets/                   ← swap-in sprites here when ready; never hardcoded paths
```

**Hard rules:**
- Nothing under `src/core/` may import from `src/ui/` or `phaser`.
- Nothing under `src/ui/` may mutate `GameState` directly — only via `GameManager`.
- `src/services/` files may not import Phaser.
- `Math.random()` is called only in `RNG.ts`.

---

## 4. Core Architecture

### 4.1 GameState

Plain data object — a snapshot, never mutated in place. `applyAction()` returns a new one.

```ts
// src/core/types.ts
export interface GameState {
  board: CellState[];          // flat array, index = row * boardSize + col
  pairs: EntanglementPair[];   // active quantum pairs
  turn: Player;
  moveNumber: number;
  captured: [number, number];  // [playerA, playerB]
  phase: 'playing' | 'collapsing' | 'game_over';
  winner: Player | null;
}

export type CellState =
  | { type: 'empty' }
  | { type: 'piece'; player: Player; isKing: boolean }
  | { type: 'ghost'; pairId: string; player: Player; isKing: boolean };

export type Player = 0 | 1;
```

### 4.2 RulesEngine

Two public functions only. Never instantiated — all static.

```ts
// src/core/RulesEngine.ts
export function getLegalActions(state: GameState, rules: RulesConfig): Action[]
export function applyAction(
  state: GameState, action: Action, rng: RNG, rules: RulesConfig
): ApplyResult

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}
```

The UI never decides what is legal. It calls `getLegalActions()` and only shows those options.

### 4.3 Actions (plain data)

```ts
export type Action =
  | { type: 'MOVE';     from: number; to: number }
  | { type: 'CAPTURE';  from: number; to: number; via: number }
  | { type: 'ENTANGLE'; from: number; to: number; pairType: 'safe' | 'gamble' }
  | { type: 'FORFEIT' }
```

### 4.4 Events (plain data)

`applyAction()` returns events as data. The UI animates from them sequentially. Animation timing is never coupled to logic.

```ts
export type GameEvent =
  | { type: 'PIECE_MOVED';         from: number; to: number }
  | { type: 'PIECE_CAPTURED';      cell: number; player: Player }
  | { type: 'KING_CROWNED';        cell: number }
  | { type: 'PAIR_CREATED';        pairId: string; pairType: 'safe' | 'gamble' }
  | { type: 'PAIR_COUNTDOWN_TICK'; pairId: string; remaining: number }
  | { type: 'COLLAPSE_TRIGGERED';  pairId: string; trigger: 'attack' | 'countdown' }
  | { type: 'COLLAPSE_RESOLVED';   pairId: string; outcome: 'safe_a' | 'safe_b' | 'gamble_win' | 'gamble_lose' }
  | { type: 'GAME_OVER';           winner: Player | null }
```

### 4.5 EventBus

Typed event bus (use `mitt` or a 10-line hand-rolled version). Nodes communicate via EventBus, never via direct scene references.

```ts
// src/services/EventBus.ts
export type BusEvents = {
  'action:submitted': Action;         // UI → GameManager
  'state:changed': GameState;         // GameManager → UI
  'game:event': GameEvent;            // GameManager → UI (drives animations)
}
```

**Rule:** A class may call methods on objects it directly owns. Communication with anything outside that ownership boundary goes through `EventBus`.

---

## 5. RulesConfig

All tweakable numbers live here. Swap the config object = different game mode. No code changes needed.

```ts
// src/config/rules.standard.ts
export const RULES_STANDARD: RulesConfig = {
  boardSize: 8,
  rowsPerPlayer: 3,
  entanglementCountdown: 3,
  maxSimultaneousPairs: -1,     // -1 = limited by free squares formula
  safePairsEnabled: true,
  gamblePairsEnabled: true,
  forcedCaptures: false,
  kingsCanEntangle: true,
  advancedQuantumInteractions: false,
  collapseTriggers: {
    onAttack: true,
    onCountdown: true,
    onOwnAttack: true,
  },
}
```

---

## 6. Visual Theme

All visual constants in one file. Never scatter hex codes or magic numbers in component files.

```ts
// src/config/theme.ts
export const THEME = {
  colors: {
    boardLight:    0xf0d9b5,
    boardDark:     0xb58863,
    playerA:       0xe8e8e8,
    playerB:       0x333333,
    safeLink:      0x4488ff,   // blue
    gambleLink:    0xffcc00,   // gold
    highlight:     0xffffff,
    collapseBurst: 0xffffff,
  },
  alpha: {
    ghost: 0.45,
    legalMoveHint: 0.25,
  },
  durations: {
    pieceMove:      180,   // ms
    capturePop:     120,
    collapseHold:   300,   // screen pause before reveal
    collapseReveal: 600,
    kingSparkle:    400,
  },
  sizes: {
    countdownPipRadius: 5,
    linkWidth:          3,
  },
} as const;
```

---

## 7. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | PascalCase | `RulesEngine.ts`, `GhostPiece.ts` |
| Interfaces/types | PascalCase | `GameState`, `ApplyResult` |
| Functions/variables | camelCase | `getLegalActions`, `activePlayer` |
| Constants/config | SCREAMING_SNAKE | `RULES_STANDARD`, `THEME` |
| EventBus keys | `'domain:event'` | `'state:changed'`, `'action:submitted'` |
| Cell indices | flat integer | `row * boardSize + col` |
| Test files | `*.test.ts` next to source | `__tests__/movement.test.ts` |

---

## 8. Visual Language (enforced, not optional)

These aren't style preferences — they're the UX contract with the player.

| State | Visual |
|---|---|
| Classical piece | Solid circle, drop shadow, player color |
| Ghost (superposed half) | Same circle, 45% opacity, breathing pulse |
| Safe pair link | Blue glowing line between the two ghosts |
| Gamble pair link | Gold glowing line, slightly thicker |
| Countdown | Shrinking arc/pips around ghost; no number label needed |
| Collapse | Screen pause 0.3s → spin/flash → particle burst → result reveal |
| King | Crown overlay or sparkle on top of piece |
| Selected piece | White outline ring |
| Legal move square | Faint dot hint |

**Collapse is the centrepiece animation.** It gets the most polish budget. Budget everything else as secondary.

---

## 9. Testing Requirements

Every rule edge case must have a Vitest unit test. Run with: `npm test`

Required test coverage (minimum before MVP ships):
- [ ] Normal move updates board correctly
- [ ] Illegal moves are absent from `getLegalActions()`
- [ ] Forced capture returned when `forcedCaptures: true`
- [ ] Safe pair created with correct squares and countdown
- [ ] Gamble pair created with correct squares and countdown
- [ ] Cannot entangle an already-entangled piece
- [ ] Countdown decrements each turn
- [ ] Countdown expiry triggers collapse
- [ ] Enemy capture attempt triggers collapse before resolving
- [ ] Collapse: safe pair always yields exactly one piece
- [ ] Collapse: gamble pair yields two pieces (rng < 0.5) or zero (rng >= 0.5)
- [ ] King promotion triggers on back rank
- [ ] Game over detected (no pieces remaining)
- [ ] Game over detected (no legal moves)

---

## 10. MVP Scope (fixed)

**In scope:**
- [x] 8×8 board, 3-row setup
- [x] Full classical checkers (move, capture, king)
- [x] Safe pair entanglement (superposition)
- [x] Gamble pair entanglement
- [x] Collapse on: enemy attack, countdown expiry
- [x] Ghost rendering with glowing link
- [x] Collapse animation
- [x] Countdown pips on ghosts
- [x] Hotseat two-player
- [x] Win/lose screen

**Out of scope (post-MVP):**
- Tutorial scene
- Main menu polish
- Advanced quantum interactions
- AI opponent
- Online play
- Full sound design (placeholder sounds OK)
- Attract mode

---

## 11. Build Order

Do not skip steps. Each step must be working before the next starts.

1. **Scaffold** — Vite + TS + Phaser, folder structure, EventBus/GameManager/RNG, RulesConfig and THEME types, Vitest config
2. **Core: classical checkers** — GameState, RulesEngine (move + capture + king), all classical tests green
3. **UI: classical checkers** — BoardRenderer + PieceSprite, GameScene translates clicks → Actions → re-render, hotseat works
4. **Core: entanglement** — EntanglementPair, entangle action, collapse logic, countdown, all quantum tests green
5. **UI: quantum visuals** — GhostPiece, EntangleLink, CollapseEffect, countdown pips
6. **Polish** — tweens, capture pop, king sparkle, win screen
7. **`vite build` + playtesting**

---

## 12. Adding a New Feature (checklist)

Before writing any code:
1. Does it belong in `core/` (a rule) or `ui/` (a visual)? Never mix.
2. Does it require a new `RulesConfig` field? Add it with a default that preserves existing behaviour.
3. Does it need a new `GameEvent` type? Add it to `types.ts`.
4. Does it need new visual constants? Add them to `theme.ts`.
5. Write the test(s) first. Get them failing. Then implement.
6. Update this document if the architecture changes.

---

## 13. What Must Never Happen

- `Math.random()` called anywhere except `RNG.ts`
- Game logic inside a Phaser `update()` or `create()` method
- A `core/` file that imports from `ui/` or imports `phaser`
- Hardcoded colors, durations, or rule numbers outside their config file
- A PR/commit with failing tests
- Collapse logic duplicated across files (one function in `RulesEngine.ts` owns it)
- Direct scene-to-scene references (use `EventBus`)
