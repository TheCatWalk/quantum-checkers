import * as THREE from 'three';
import { Piece } from './Piece';

export class PieceManager {
  private pieces: Piece[] = [];
  private group: THREE.Group;
  private boardSize = 8;
  private cellSize = 2.2;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.initializePieces();
  }

  private initializePieces(): void {
    const boardDim = this.boardSize * this.cellSize;
    const half = boardDim / 2;

    // Player 1 (cyan) - top 3 rows on playable squares
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if ((row + col) % 2 === 0) {  // Playable square
          const x = (col + 0.5) * this.cellSize - half;
          const y = (row + 0.5) * this.cellSize - half;
          const piece = new Piece(x, y, 0);
          this.pieces.push(piece);
          this.group.add(piece.mesh);
        }
      }
    }

    // Player 2 (magenta) - bottom 3 rows on playable squares
    for (let row = this.boardSize - 3; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if ((row + col) % 2 === 0) {  // Playable square
          const x = (col + 0.5) * this.cellSize - half;
          const y = (row + 0.5) * this.cellSize - half;
          const piece = new Piece(x, y, 1);
          this.pieces.push(piece);
          this.group.add(piece.mesh);
        }
      }
    }
  }

  update(): void {
    // Animation updates can go here
  }

  getPieces(): Piece[] {
    return this.pieces;
  }
}
