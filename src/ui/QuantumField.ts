import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

// WebGL aurora background shaders
const VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 col = mix(vec3(0.08, 0.06, 0.15), vec3(0.12, 0.08, 0.22), uv.y);

  float t = time * 0.15;

  // Subtle starfield using noise
  float stars = fbm(gl_FragCoord.xy * 0.001) * 0.5 + 0.5;
  stars = smoothstep(0.6, 0.95, stars);
  float twinkle = 0.5 + 0.5 * sin(time * 2.0 + stars * 10.0);
  col += vec3(0.7, 0.8, 1.0) * stars * twinkle * 0.3;

  // Quantum amplitude waves
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float phase = fi * 1.57;
    float wav = fbm(vec2(uv.x * 2.0 + t * (0.8 + fi * 0.2) + fi * 5.0, uv.y * 0.5 + t * 0.3 + phase));
    float center = 0.45 + fi * 0.12 + 0.05 * sin(uv.x * 4.0 + t * 1.5 + fi);
    float d = abs(uv.y - center - 0.08 * (wav - 0.5));
    float glow = smoothstep(0.18, 0.0, d) * (0.35 + 0.65 * wav);

    vec3 q_col = mix(
      vec3(0.3, 1.0, 0.95),
      mix(vec3(1.0, 0.4, 1.0), vec3(0.2, 0.8, 0.95), fi * 0.4),
      sin(t * 0.5 + fi) * 0.5 + 0.5
    );
    col += q_col * glow * 0.75;
  }

  // Depth distortion
  col *= 0.95 + 0.05 * sin(uv.x * 2.0 + t * 0.3) * sin(uv.y * 2.0 + t * 0.4);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class QuantumField {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private timeUniform: WebGLUniformLocation;
  private resolutionUniform: WebGLUniformLocation;
  private positionAttr: number;
  private vertexBuffer: WebGLBuffer;
  private startTime: number;
  private game: Phaser.Game;

  constructor() {
    // Create aurora background canvas - fixed position
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'quantum-field';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '1';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.margin = '0';
    this.canvas.style.padding = '0';

    const gl = this.canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    this.program = this.createProgram();
    this.timeUniform = gl.getUniformLocation(this.program, 'time')!;
    this.resolutionUniform = gl.getUniformLocation(this.program, 'resolution')!;
    this.positionAttr = gl.getAttribLocation(this.program, 'position');

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(this.canvas);

    this.startTime = Date.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.animate();

    // Create Phaser game on top
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      render: {
        antialias: true,
        pixelArt: false,
      },
      scene: [BootScene, GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
      },
    };

    this.game = new Phaser.Game(config);

    // Position Phaser canvas on top
    const phaserCanvas = this.game.canvas;
    phaserCanvas.style.position = 'fixed';
    phaserCanvas.style.top = '0';
    phaserCanvas.style.left = '0';
    phaserCanvas.style.width = '100vw';
    phaserCanvas.style.height = '100vh';
    phaserCanvas.style.zIndex = '10';
    phaserCanvas.style.margin = '0';
    phaserCanvas.style.padding = '0';
  }

  private createProgram(): WebGLProgram {
    const vs = this.compileShader(VERTEX, this.gl.VERTEX_SHADER);
    const fs = this.compileShader(FRAGMENT, this.gl.FRAGMENT_SHADER);
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      console.error('Shader link error:', this.gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private compileShader(src: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private animate = (): void => {
    const time = (Date.now() - this.startTime) / 1000.0;

    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.timeUniform, time);
    this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(this.positionAttr);
    this.gl.vertexAttribPointer(this.positionAttr, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(this.animate);
  };

  triggerCollapse(): void {
    // Collapse event handling
  }

  destroy(): void {
    this.canvas.remove();
    this.game.destroy(true);
  }
}
