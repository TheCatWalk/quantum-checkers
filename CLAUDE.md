# Claude Code — Working Notes

> Read this top to bottom. The rules below are hard constraints, not suggestions.
> This project is TypeScript + Phaser 3 + Vite. (Ignore any "Godot" note in memory — it is wrong.)

## RULE ZERO — never run the game

**The user verifies every fix manually. You do not run the game, ever, unless the user explicitly says so in a prompt** (e.g. "run it", "start the dev server", "test it in the browser").

Without that explicit permission, you must NOT:
- run `npm run dev`, `npm run preview`, `npm start`, or any command that serves/launches the app
- open, automate, or screenshot a browser
- use the `verify` or `run` skills

Default behavior: make the edit, describe it, and stop. Assume the user will check it themselves. If you genuinely think running it is needed, **ask first and wait** — do not run it on your own initiative.

## Default loop for any bug or text change

1. Identify the file from the **Module map** below. Do NOT explore to "understand the codebase."
2. Read ONLY that file (plus one object file if the table says so). Max **2 files** before editing.
3. Make the edit.
4. Stop. Report what you changed in 1–3 sentences. Done.

If you have read 2 files and still don't know the fix, say so and ask — do not keep reading.

## HARD STOPS — never do these unless the user explicitly asks

- ❌ **No browser automation.** Never write or run Playwright/Puppeteer scripts. Never `npm install playwright`. Never launch a headless browser, click cells, or screenshot game states. This is the #1 token sink — banned outright.
- ❌ **No "reproduce it first."** Trust the user's bug report. They told you what's broken; go fix that.
- ❌ **No reading the whole codebase.** No reading `types.ts`, `theme.ts`, tests, or the engine "for context" on a UI bug. Read the one file that owns the bug.
- ❌ **No running the test suite for UI changes.** Tests cover the engine only (see boundary below). Only run `npm test` if you edited `src/core/`.
- ❌ **No `verify` skill, no screenshots, no dev-server launching** to confirm a fix. State the change; the user will look.
- ❌ **No long planning passes.** Don't think for minutes. If the fix isn't obvious after reading the target file, make your best single edit or ask.

## Module map — go straight here, read nothing else

| Symptom | File to edit | Also allowed |
|---|---|---|
| Stale/wrong highlight dots, selection not clearing, click handling | `src/ui/scenes/GameScene.ts` | `src/ui/objects/BoardRenderer.ts` |
| Piece icon / king crown look | `src/ui/objects/PieceSprite.ts` | — |
| Wrong legal moves, king can't move backward, promotion logic | `src/core/RulesEngine.ts` | run `npm test` after |
| Turn flow, event ordering | `src/services/GameManager.ts` | — |
| Colors, sizes, durations, text labels | `src/config/theme.ts` | — |
| Shared types | `src/core/types.ts` | — |

A king moving wrong is **logic** → `RulesEngine.ts`. A king *looking* wrong is **visual** → `PieceSprite.ts`. A highlight not clearing is **UI state** → `GameScene.ts`. Pick one; don't open all three.

## Layer boundary (why you can trust the table)

- `src/core/` = pure TS, fully unit-tested. If a UI element looks wrong, the bug is NOT here.
- `src/ui/` = rendering + input only, no game logic.
- `src/services/GameManager.ts` = the bridge.

State flow: `click → GameScene → action:submitted → GameManager → applyAction → state:changed → GameScene rebuilds UI`

## Files to never open unless the bug is explicitly inside them

`EntanglementPair.ts`, `GhostSprite.ts`, `EntangleLink.ts`, `BootScene.ts`, `MenuScene.ts`, `GameOverScene.ts`, `DESIGN_GUIDELINES.md`, `HOW_TO_PLAY.md`.

## Efficiency contract

A typical fix here = **read 1 file, make 1 edit, write 2 sentences.** If you find yourself reading a 3rd file, installing a package, or writing a script, you have gone off the rails — stop and reconsider.
