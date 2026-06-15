# Hybrid Aurora + Phaser Setup

**Status:** ✅ Working - transparent board with visible aurora background

## Architecture

WebGL aurora canvas (z-index 1, fixed) sits behind Phaser game canvas (z-index 10, fixed). Phaser set to transparent so aurora shows through.

### Key Implementation Details

**src/ui/QuantumField.ts**
- Single responsibility: manages both aurora rendering AND Phaser game initialization
- Aurora: WebGL canvas with procedural shader (noise, waves, starfield)
- Aurora canvas: `position: fixed`, `100vw/100vh`, `z-index: 1`, `pointer-events: none`
- Phaser canvas: `position: fixed`, `100vw/100vh`, `z-index: 10` (sits on top)
- Both canvases: margin/padding 0, body overflow hidden

**src/ui/scenes/GameScene.ts**
- DO NOT call `cam.setBackgroundColor()` - camera defaults to transparent
- This allows aurora to show through beneath the board and pieces

**src/ui/boardConfig.ts**
- Board size: 40% of viewport width (shows more aurora around edges)

**src/config/theme.ts - Visibility Settings**
```
alpha:
  boardTile:  0.35  // playable cells (increased from 0.15)
  boardVoid:  0.12  // non-playable cells (increased from 0.03)
  gridLine:   0.6   // grid lines (increased from 0.35)

colors:
  gridLine:   0x00ffff  // bright neon cyan (was 0x3a7a8a)
```

## What Works
✅ Aurora visible on title screen (BootScene)
✅ Aurora visible during gameplay (GameScene with transparent camera)
✅ Click input works properly (pointer-events: none on aurora canvas)
✅ Beautiful glossy Phaser pieces with proper rendering
✅ Board appears with transparency showing aurora beneath
✅ Neon grid lines provide visual clarity
✅ Board tiles visible enough to play but transparent enough to show aurora

## Critical Implementation Rules
1. Never set a solid background color on GameScene camera
2. Always use `pointer-events: none` on background layers
3. Use `100vw/100vh` for full window coverage (simpler than computed dimensions)
4. Set body `overflow: hidden` to prevent scrollbars
5. Board opacity must be high enough to be visible over aurora (was 0.15, now 0.35)
6. Neon colors work well with aurora background for good contrast

## Known Limitations
- Board blends slightly with aurora background (design choice - could increase opacity further if needed)
- No bloom effect on pieces currently (simplified approach working well)

## Next Steps for Code Cleanup
- Remove unused Three.js imports (AuroraRenderer, etc.)
- Remove unused game/ directory files
- Consolidate shader code (move shaders to separate files?)
- Optimize performance (currently renders both aurora and Phaser continuously)
