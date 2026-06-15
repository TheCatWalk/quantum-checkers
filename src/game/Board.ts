import * as THREE from 'three';

export class Board {
  private scene: THREE.Scene;
  private group!: THREE.Group;
  private boardSize = 8;
  private cellSize = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBoard();
  }

  private createBoard(): void {
    this.group = new THREE.Group();

    // Create cells
    const boardDim = this.boardSize * this.cellSize;
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const isPlayable = (row + col) % 2 === 0;
        const color = isPlayable ? 0x223d70 : 0x070a16;
        const opacity = isPlayable ? 0.15 : 0.03;

        const geometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        const material = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity,
          emissive: color,
          emissiveIntensity: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = col * this.cellSize - boardDim / 2;
        mesh.position.y = row * this.cellSize - boardDim / 2;
        this.group.add(mesh);
      }
    }

    // Add grid lines
    const gridLines = new THREE.Group();
    const gridColor = 0x3a7a8a;
    for (let i = 0; i <= this.boardSize; i++) {
      const pos = i * this.cellSize - boardDim / 2;

      // Horizontal line
      const hGeom = new THREE.BufferGeometry();
      hGeom.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([
          -boardDim / 2, pos, 0,
          boardDim / 2, pos, 0,
        ]),
        3
      ));
      const hLine = new THREE.Line(hGeom, new THREE.LineBasicMaterial({ color: gridColor, opacity: 0.35, transparent: true }));
      gridLines.add(hLine);

      // Vertical line
      const vGeom = new THREE.BufferGeometry();
      vGeom.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([
          pos, -boardDim / 2, 0,
          pos, boardDim / 2, 0,
        ]),
        3
      ));
      const vLine = new THREE.Line(vGeom, new THREE.LineBasicMaterial({ color: gridColor, opacity: 0.35, transparent: true }));
      gridLines.add(vLine);
    }
    this.group.add(gridLines);

    // Add border frame
    const frameGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(boardDim, boardDim));
    const frameWireframe = new THREE.LineSegments(frameGeom, new THREE.LineBasicMaterial({ color: 0x46e0ff, opacity: 0.9, transparent: true, linewidth: 3 }));
    this.group.add(frameWireframe);

    // Slight tilt for 3D perspective
    this.group.rotation.x = 0.1;
    this.scene.add(this.group);
  }

  update(): void {
    // Animation updates can go here
  }
}
