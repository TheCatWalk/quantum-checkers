import * as THREE from 'three';

export class AuroraRenderer {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.OrthographicCamera;
  private canvas: HTMLCanvasElement;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-10, 10, 5.625, -5.625, 0.1, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;

    this.createAurora();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createAurora(): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a0033, // Deep purple
    });

    const geometry = new THREE.PlaneGeometry(20, 11.25);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 0;
    this.scene.add(mesh);

    // Add animated shader after basic test
    this.addShaderAurora();

    // Store material ref for animation
    (this.scene.userData as any).aurormaMaterial = (this.scene as any).shaderMesh?.material;
  }

  private addShaderAurora(): void {
    const auroraVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const auroraFragmentShader = `
      varying vec2 vUv;
      uniform float time;

      void main() {
        vec2 uv = vUv;

        // Simple animated gradient
        vec3 colorTop = vec3(0.3, 0.0, 0.6); // Deep purple
        vec3 colorMid = vec3(0.6, 0.2, 1.0); // Magenta
        vec3 colorBot = vec3(0.2, 0.9, 0.8); // Cyan

        // Vertical gradient with wave
        float wave = sin(uv.x * 3.0 + time) * 0.1;
        float y = uv.y + wave;

        vec3 color;
        if (y < 0.5) {
          color = mix(colorTop, colorMid, y * 2.0);
        } else {
          color = mix(colorMid, colorBot, (y - 0.5) * 2.0);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      uniforms: {
        time: { value: 0 }
      }
    });

    const geometry = new THREE.PlaneGeometry(20, 11.25);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 0.1;
    this.scene.add(mesh);

    (this.scene as any).shaderMesh = mesh;
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const shaderMesh = (this.scene as any).shaderMesh;
    if (shaderMesh && shaderMesh.material.uniforms) {
      shaderMesh.material.uniforms.time.value += 0.016; // ~60fps
    }

    this.renderer.render(this.scene, this.camera);
  };

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getImageData(): string {
    return this.canvas.toDataURL('image/png');
  }
}
