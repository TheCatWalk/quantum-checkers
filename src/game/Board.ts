import * as THREE from 'three';

export class Board {
  private scene: THREE.Scene;
  private group!: THREE.Group;
  private boardSize = 8;
  private cellSize = 2.2;  // Even bigger board

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBoard();
  }

  private createBoard(): void {
    this.group = new THREE.Group();
    const boardDim = this.boardSize * this.cellSize;
    const half = boardDim / 2;

    // Draw grid lines - 9 lines each direction for 8x8 grid
    const gridColor = 0x3a7a8a;
    for (let i = 0; i <= this.boardSize; i++) {
      const pos = i * this.cellSize - half;

      // Horizontal line
      const hGeom = new THREE.BufferGeometry();
      hGeom.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([-half, pos, 0, half, pos, 0]),
        3
      ));
      const hLine = new THREE.Line(hGeom, new THREE.LineBasicMaterial({ color: gridColor, opacity: 0.4 }));
      this.group.add(hLine);

      // Vertical line
      const vGeom = new THREE.BufferGeometry();
      vGeom.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([pos, -half, 0, pos, half, 0]),
        3
      ));
      const vLine = new THREE.Line(vGeom, new THREE.LineBasicMaterial({ color: gridColor, opacity: 0.4 }));
      this.group.add(vLine);
    }

    // Add neon border
    const frameGeom = new THREE.BufferGeometry();
    frameGeom.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([
        -half, -half, 0,
        half, -half, 0,
        half, half, 0,
        -half, half, 0,
      ]),
      3
    ));
    frameGeom.setIndex([0, 1, 1, 2, 2, 3, 3, 0]);
    const frameWireframe = new THREE.LineSegments(frameGeom, new THREE.LineBasicMaterial({ color: 0x46e0ff, linewidth: 2 }));
    this.group.add(frameWireframe);

    this.scene.add(this.group);
  }

  update(): void {
    // Animation updates can go here
  }
}
