import * as THREE from 'three';
import { AuroraBackground } from './AuroraBackground';
import { Board } from './Board';
import { PieceManager } from './PieceManager';

export class Game {
  private scene: THREE.Scene;
  private aurora!: AuroraBackground;
  private board!: Board;
  private pieceManager!: PieceManager;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  start(): void {
    // Create aurora background
    this.aurora = new AuroraBackground(this.scene);

    // Create board
    this.board = new Board(this.scene);

    // Create pieces
    this.pieceManager = new PieceManager(this.scene);
  }

  update(): void {
    this.aurora.update();
    this.board.update();
    this.pieceManager.update();
  }
}
