# How to Play Quantum Checkers

## Overview

Quantum Checkers is standard checkers with two extra moves borrowed from quantum mechanics: **Safe Entangle** and **Gamble Entangle**. A piece that is entangled becomes a ghost — it exists in two places at once until it collapses into one (or zero) real pieces.

---

## Basic Rules (same as classic checkers)

- **Player 1** controls light pieces and moves **up** the board.
- **Player 2** controls dark pieces and moves **down** the board.
- Pieces move diagonally, one square at a time, to an empty dark square.
- Capture an opponent's piece by jumping over it to the empty square behind it.
- Multi-jumps are allowed in a single turn.
- Reach the opponent's back row to become a **King** (gold ring) — kings can move in all four diagonal directions.
- You win by capturing all of your opponent's pieces, or leaving them with no legal move.

---

## The Quantum Moves

Instead of moving, you can entangle a piece. This splits it into a **ghost** — a semi-transparent piece that occupies two squares simultaneously.

### Safe Entangle (blue dot)

> "The piece is in one of two squares — we just don't know which."

1. Click your piece. Blue dots appear on the empty diagonal squares it could move to.
2. **Left-click** a blue dot.
3. Your piece becomes a ghost occupying **both** the original square and the destination.
4. A **blue glowing line** (the entanglement link) connects the two squares. Countdown pips above the link show how many turns remain.
5. When the ghost collapses, a 50/50 coin flip decides which square gets the real piece. The other goes empty.

### Gamble Entangle (gold dot)

> "There might be two pieces here — or none at all."

1. Click your piece. Gold dots appear below the blue dots when both types are available.
2. **Right-click** a gold dot.
3. Your piece becomes a ghost with a **gold glowing line**.
4. When it collapses: 50% chance **both** squares materialise as real pieces (you doubled up!), 50% chance **both** squares go empty (you lost the piece entirely).

---

## Ghost Piece Rules

- **Ghosts can capture enemies.** Click a ghost to see its available captures (shown as white dots).
- **Ghosts cannot move normally** — only capture or wait for collapse.
- **You cannot entangle a ghost** — only classical (solid) pieces can entangle.

---

## When Does a Ghost Collapse?

Three triggers force a ghost to collapse (reveal its true state):

| Trigger | What happens |
|---|---|
| **Countdown expires** | After a set number of turns the pair collapses automatically. The countdown pips on the link count down each turn. |
| **Enemy attacks the ghost** | An opponent jumps over one of the ghost squares. The ghost collapses *first* — if the piece evades to the other square, the attacker merely steps forward instead of capturing. If the piece was there, it gets captured normally. |
| **You attack with the ghost** | Your own ghost jumps an enemy piece. The ghost collapses first — if it evades, the capture is cancelled. If it stays, the capture proceeds. |

A brief flash appears when collapse is triggered; a burst shows where the piece landed (or disappeared).

---

## Controls Summary

| Action | How |
|---|---|
| Select a piece | Left-click it |
| Move | Left-click a **white** dot |
| Capture | Left-click the destination (white dot over the jump) |
| Enter Entangle Mode | Press **E** while a piece is selected |
| Safe Entangle | In entangle mode — left-click a **blue** dot |
| Gamble Entangle | In entangle mode — right-click a **gold** dot |
| Exit Entangle Mode | Press **E** again, or deselect the piece |
| Deselect | Left-click empty space |

> **Tip:** When a piece is selected in normal mode, small **blue/gold pips** appear in the corner of the move dots to indicate that entangle options exist for those squares. Press **E** to switch to entangle mode and use them.

---

## Visual Guide

| Visual | Meaning |
|---|---|
| Semi-transparent piece | Ghost (superposition) |
| Blue aura ring on ghost | Safe pair |
| Gold aura ring on ghost | Gamble pair |
| Glowing blue line | Safe entanglement link |
| Glowing gold line | Gamble entanglement link |
| Dots above the link | Turns remaining before forced collapse |
| White burst | Collapse revealed — piece is there |
| Blue burst | Collapse revealed — piece vanished |
| Gold ring around piece | King |

---

## Tips

- Safe entangle is good for dodging: an enemy attacking your ghost has a 50% chance of missing entirely.
- Gamble entangle is high risk / high reward — use it when you need extra pieces more than you fear losing one.
- Keep an eye on the countdown pips. A ghost that collapses by countdown is random; you may want to trigger it yourself by attacking with it.
- The HUD pair list (below the board) shows each active pair as `● 2` (safe, 2 turns left) or `◆ 1` (gamble, 1 turn left).
