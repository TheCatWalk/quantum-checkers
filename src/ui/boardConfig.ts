export interface BoardConfig {
  offsetX: number;
  offsetY: number;
  cellSize: number;
  boardSize: 6 | 8;
}

// Create board config centered on viewport, ~60% width
export function createBoardConfig(viewportWidth: number, viewportHeight: number): BoardConfig {
  const boardSize = 8;
  const boardWidthRatio = 0.8;  // Board is 80% of viewport width
  const boardWidth = viewportWidth * boardWidthRatio;
  const cellSize = boardWidth / boardSize;
  const boardHeight = cellSize * boardSize;

  const offsetX = (viewportWidth - boardWidth) / 2;
  const offsetY = (viewportHeight - boardHeight) / 2;

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
