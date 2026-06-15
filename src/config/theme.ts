export const THEME = {
  colors: {
    // ── Aurora palette — deep night-sky void with shifting teal/violet glow ──
    boardLight:     0x070a16,   // non-playable squares — recede into the void
    boardDark:      0x223d70,   // playable squares — raised glass tiles
    gridLine:       0x00ffff,   // neon cyan grid lines — bright and vibrant
    boardFrame:     0x46e0ff,   // neon frame — bright cyan glow

    playerA:        0x3df5c4,   // teal energy
    playerB:        0xb06bff,   // violet energy
    playerAStroke:  0x8affe4,
    playerBStroke:  0xd4b0ff,

    safeLink:       0x46e0ff,   // cyan — superposition pairs
    gambleLink:     0xffd447,   // gold — creation/annihilation pairs
    highlight:      0x7df9ff,   // selection ring — bright aurora cyan
    legalHint:      0x8affe4,   // move dots — soft teal
    collapseBurst:  0xffffff,
    background:     0x060814,   // night-sky void
    hudText:        0xdfe8ff,
  },
  alpha: {
    ghost:      0.45,
    legalHint:  0.30,
    linkBase:   0.80,
    boardTile:  0.35,   // playable-cell fill — clearer while showing aurora
    boardVoid:  0.12,   // non-playable-cell fill — visible but subtle
    gridLine:   0.6,    // brighter grid for clarity
  },
  durations: {
    pieceMove:      180,  // ms
    capturePop:     120,
    collapseHold:   300,  // screen pause before reveal
    collapseReveal: 600,
    kingSparkle:    400,
    ghostPulse:     900,
    pieceBreath:    2200,  // idle orb pulse
  },
  sizes: {
    countdownPipRadius:  5,
    linkWidth:           3,
    pieceRadiusFraction: 0.38,  // fraction of one cell's width
  },
} as const;
