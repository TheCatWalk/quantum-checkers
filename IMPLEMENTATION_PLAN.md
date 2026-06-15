# Eldritch Quantum Checkers — Implementation Plan

## Vision
Two eldritch entities battle in a quantum dimensional field. The board is a glassy phantom floating in space.

## Modular Tasks

### Phase 1: Board Geometry & Positioning
- [ ] **Task 1.1**: Create `BoardViewConfig` in theme — board should be ~60% of viewport width, centered
- [ ] **Task 1.2**: Update `boardConfig.ts` to use viewport-relative sizing instead of fixed dimensions
- [ ] **Task 1.3**: Center board on screen (offsetX, offsetY calculated from viewport center)
- [ ] **Task 1.4**: Verify board renders centered and smaller, aurora visible on all sides

### Phase 2: Glass & Glow Effect
- [ ] **Task 2.1**: Update `theme.ts` — increase `alpha.boardTile` and `alpha.boardVoid` for more transparency
- [ ] **Task 2.2**: Add glowing border around board — stronger frame color with bloom effect
- [ ] **Task 2.3**: Add subtle radial shadow/glow under board edges (graphics layer)
- [ ] **Task 2.4**: Verify board looks glassy and ethereal

### Phase 3: Perspective & Depth
- [ ] **Task 3.1**: Add subtle rotation/tilt to board (3-5 degrees) to suggest floating
- [ ] **Task 3.2**: Add perspective distortion (optional, depends on visual impact)
- [ ] **Task 3.3**: Verify board feels like it's suspended in space

### Phase 4: Entity Luminosity
- [ ] **Task 4.1**: Increase piece brightness/glow in `PieceSprite.ts`
- [ ] **Task 4.2**: Add bloom/radiance effect to pieces (via camera postFX or graphics overlay)
- [ ] **Task 4.3**: Make pieces feel like they're emitting light into the quantum field

## Dependencies
- Each phase builds on the previous one
- Keep pieces unchanged (abstract glyphs come later)
- Aurora renders unchanged behind everything

## Success Criteria
- Board is ~60% viewport width, centered, visibly floating
- Aurora clearly visible on all sides
- Board reads as glassy/transparent with glowing edges
- Pieces glow and feel luminous
- Overall vibe: cosmic battle in a dimensional void
