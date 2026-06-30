export interface BoardConfig {
  offsetX: number;
  offsetY: number;
  cellSize: number;
  boardSize: 6 | 8;
}

// Space reserved for the HUD chrome so the board never collides with it.
// (See HUD.ts — top turn bar, bottom hint bar, right-hand info panel.)
const MARGIN_TOP    = 80;   // turn-indicator frame
const MARGIN_BOTTOM = 110;  // hint/controls frame
const MARGIN_RIGHT  = 300;  // right-hand pieces/pairs panel
const MARGIN_LEFT   = 24;

// Size the board to fit the free area (left of the right panel, between the
// top and bottom bars) and centre it there — never sized past the viewport.
export function createBoardConfig(viewportWidth: number, viewportHeight: number): BoardConfig {
  const boardSize = 8;

  const usableWidth  = viewportWidth  - MARGIN_LEFT - MARGIN_RIGHT;
  const usableHeight = viewportHeight - MARGIN_TOP  - MARGIN_BOTTOM;

  // Square board fits the smaller dimension of the free region.
  const span = Math.max(boardSize, Math.min(usableWidth, usableHeight));
  const cellSize = Math.floor(span / boardSize);
  const boardSpan = cellSize * boardSize;

  const offsetX = MARGIN_LEFT + (usableWidth  - boardSpan) / 2;
  const offsetY = MARGIN_TOP  + (usableHeight - boardSpan) / 2;

  return { offsetX, offsetY, cellSize, boardSize };
}

export function cellToScreen(cell: number, cfg: BoardConfig): { x: number; y: number } {
  const row = Math.floor(cell / cfg.boardSize);
  const col = cell % cfg.boardSize;
  return {
    x: cfg.offsetX + col * cfg.cellSize + cfg.cellSize / 2,
    y: cfg.offsetY + row * cfg.cellSize + cfg.cellSize / 2,
  };
}

export function screenToCell(x: number, y: number, cfg: BoardConfig): number | null {
  const col = Math.floor((x - cfg.offsetX) / cfg.cellSize);
  const row = Math.floor((y - cfg.offsetY) / cfg.cellSize);
  if (col < 0 || col >= cfg.boardSize || row < 0 || row >= cfg.boardSize) return null;
  return row * cfg.boardSize + col;
}
