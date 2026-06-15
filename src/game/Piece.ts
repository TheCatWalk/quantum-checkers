import * as THREE from 'three';

export class Piece {
  mesh: THREE.Mesh;

  constructor(x: number, y: number, player: 0 | 1) {
    const color = player === 0 ? 0x3df5c4 : 0xb06bff;

    // Create canvas texture with gradient for depth
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient for depth/3D look
    const gradient = ctx.createRadialGradient(128, 128, 30, 128, 128, 180);
    const rgb = player === 0
      ? [61, 245, 196]   // cyan
      : [176, 107, 255]; // magenta

    gradient.addColorStop(0, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    gradient.addColorStop(0.7, `rgb(${Math.floor(rgb[0]*0.8)}, ${Math.floor(rgb[1]*0.8)}, ${Math.floor(rgb[2]*0.8)})`);
    gradient.addColorStop(1, `rgb(${Math.floor(rgb[0]*0.4)}, ${Math.floor(rgb[1]*0.4)}, ${Math.floor(rgb[2]*0.4)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Add highlight ring at top
    ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 100, 60, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const geometry = new THREE.SphereGeometry(0.65, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: color,
      emissiveIntensity: 1.8,
      metalness: 0.7,
      roughness: 0.3,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(x, y, 0.6);
  }

  getPosition() {
    return { x: this.mesh.position.x, y: this.mesh.position.y };
  }

  setPosition(x: number, y: number) {
    this.mesh.position.set(x, y, 0.6);
  }
}
