import * as THREE from 'three';
import { AuroraBackground } from './AuroraBackground';
import { Board } from './Board';

export class Game {
  private scene: THREE.Scene;
  private aurora!: AuroraBackground;
  private board!: Board;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  start(): void {
    // Create aurora background
    this.aurora = new AuroraBackground(this.scene);

    // Create board
    this.board = new Board(this.scene);
  }

  update(): void {
    this.aurora.update();
    this.board.update();
  }
}
