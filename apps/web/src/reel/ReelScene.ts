import {
  CanvasTexture, LinearFilter, LinearSRGBColorSpace, Mesh, NoColorSpace, PerspectiveCamera, PlaneGeometry, Scene,
  ShaderMaterial, WebGLRenderer, Group,
} from 'three'
import { CELL_H, CELL_W, FRAME, PITCH_RATIO, drawAtlas, fontsReady } from './atlas'
import type { FrameSpec } from './frames'

const MAX = 8 // frames the shader holds; the plan has 4 slots, the recorded sample 7

const vertex = /* glsl */ `
uniform float uTime;
uniform float uBend;
varying vec2 vUv;
varying float vX;
void main() {
  vUv = uv;
  vec3 p = position;
  // the strip lies loose on the lightbox: a slow curl in depth, never a flat card
  p.z += sin(p.x * 0.42 + uTime * 0.18) * uBend + cos(p.x * 0.17 - 0.6) * uBend * 1.6;
  p.y += sin(p.x * 0.23 + 1.3 + uTime * 0.11) * uBend * 0.35;
  vX = position.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

const film = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform float uCount, uOffset, uPitch, uGate, uTime, uStripH, uLoop, uHead;
uniform float uRefused[${MAX}];
uniform float uExpose[${MAX}];
uniform float uFlash[${MAX}];
uniform float uFog[${MAX}];
varying vec2 vUv;
varying float vX;

const vec3 ACETATE = vec3(0.780, 0.373, 0.165);
const vec3 INK = vec3(0.102, 0.071, 0.051);
const vec3 PRINT = vec3(0.945, 0.741, 0.271);
const vec3 PENCIL = vec3(0.831, 0.188, 0.165);
const vec3 FOG = vec3(0.953, 0.925, 0.890);
const vec3 WARM = vec3(1.0, 0.82, 0.52);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float pick(float a[${MAX}], int i) { float v = 0.0; for (int k = 0; k < ${MAX}; k++) if (k == i) v = a[k]; return v; }

void main() {
  float f = (vX - uGate) / uPitch + uOffset;      // frame units; frame i is centred on f = i
  float idxF = floor(f + 0.5);
  float local = f - idxF + 0.5;                     // 0..1 across this frame's cell
  float slot = uLoop > 0.5 ? mod(idxF, uCount) : idxF; // the replay reel loops; a live reel has leader at both ends
  int idx = int(slot);
  bool inReel = uCount > 0.0 && (uLoop > 0.5 || (idxF >= 0.0 && idxF < uCount));
  float v = vUv.y;
  float aspect = uPitch / uStripH;                  // cell width / strip height, for round perforations

  // sprocket holes: four per frame, punched through to the lightbox
  float band = v < 0.5 ? v : 1.0 - v;
  if (band < 0.14) {
    vec2 hp = vec2((fract(local * 4.0) - 0.5) * aspect / 4.0, band - 0.07);
    if (box(hp, vec2(0.034, 0.042), 0.012) < 0.0) discard;
  }

  float lit = 1.0 - smoothstep(0.45, 0.95, abs(f - uOffset)); // light is the state: only the gate is lit
  // what this frame has been through: in the replay, every frame behind the head stays developed,
  // the head plays its moment, frames ahead are still unexposed; a live reel reads its own state
  float e = 0.0, fog = 0.0, flash = 0.0;
  if (inReel) {
    if (uLoop < 0.5 || abs(idxF - uHead) < 0.5) { e = pick(uExpose, idx); fog = pick(uFog, idx); flash = pick(uFlash, idx); }
    else if (idxF < uHead) { e = 1.0; fog = pick(uRefused, idx); }
  }
  // grain is the stock itself, static; it only boils while a frame is being exposed
  float boil = step(0.02, flash) * floor(uTime * 12.0);
  float grain = (hash(floor(vUv * vec2(1400.0, 260.0)) + boil) - 0.5) * 0.045;
  float density = sin(vX * 0.9) * 0.015;
  float sheen = smoothstep(0.0, 1.0, 1.0 - abs(fract(vX * 0.035 - uTime * 0.02 + v * 0.3) - 0.5) * 8.0) * 0.05;

  vec3 col = ACETATE * mix(0.9, 1.06, lit) + grain + density + sheen;
  col += WARM * flash * 0.32 * exp(-abs(local - 0.5) * 3.0); // a light leak spills onto the base around a fresh frame
  col += WARM * 0.2 * exp(-pow((f - uOffset) / 0.75, 2.0)); // the gate lamp shines up through the acetate

  if (inReel) {
    // off register: idle frames ride a hair loose, the gate frame sits on the pin
    float jitter = sin(uTime * 0.7 + idxF * 1.7) * 0.006 * (1.0 - lit);
    vec2 auv = vec2((slot + local) / float(${MAX}), v + jitter);
    vec4 a = texture2D(uAtlas, auv);
    vec2 fr = vec2(local, 1.0 - v);
    vec2 lo = vec2(${(FRAME.x / (CELL_H * PITCH_RATIO)).toFixed(4)}, ${(FRAME.y / CELL_H).toFixed(4)});
    vec2 hi = lo + vec2(${(FRAME.w / (CELL_H * PITCH_RATIO)).toFixed(4)}, ${(FRAME.h / CELL_H).toFixed(4)});
    bool inFrame = fr.x > lo.x && fr.x < hi.x && fr.y > lo.y && fr.y < hi.y;
    if (inFrame) {
      vec2 q = (fr - lo) / (hi - lo);               // 0..1 inside the frame window
      // unexposed stock: dense, grainy, faintly brown at the edges, never a flat hole
      vec3 raw = vec3(0.07, 0.048, 0.036) * (0.8 + 0.35 * (1.0 - length(q - 0.5))) + grain * 0.9;
      vec3 img = mix(raw, a.rgb, e);                // develops from unexposed stock
      img += WARM * flash * 0.5 * (1.0 - length(q - 0.5) * 1.3);
      img = mix(img, FOG, fog * 0.86);              // the refusal overexposes the frame
      // grease-pencil cross, drawn on as the fog lands
      float wob = (hash(floor(q * 90.0)) - 0.5) * 0.006;
      float w = 0.024;
      float d1 = abs(q.y - q.x + wob), d2 = abs(q.y - (1.0 - q.x) + wob);
      float s1 = step(q.x, clamp(fog * 2.0, 0.0, 1.0) * 0.9 + 0.05) * step(0.05, q.x);
      float s2 = step(q.x, clamp(fog * 2.0 - 1.0, 0.0, 1.0) * 0.9 + 0.05) * step(0.05, q.x);
      float x = max((1.0 - smoothstep(w * 0.6, w, d1)) * s1, (1.0 - smoothstep(w * 0.6, w, d2)) * s2);
      img = mix(img, PENCIL, x);
      img *= mix(0.58, 1.0, lit);
      // registration edge: the gate frame alone is outlined in edge-print yellow
      float edge = min(min(q.x, 1.0 - q.x) * aspect, min(q.y, 1.0 - q.y));
      img = mix(img, PRINT, (1.0 - smoothstep(0.004, 0.008, edge)) * smoothstep(0.85, 1.0, lit));
      col = img;
    } else {
      col = mix(col, a.rgb, a.a * 0.92);            // edge print sits on the acetate
    }
  } else {
    // leader: blank acetate before and after the reel
    col *= 0.96;
  }
  gl_FragColor = vec4(col, 1.0);
}`

const shadow = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  float v = vUv.y;
  float a = smoothstep(0.0, 0.32, v) * smoothstep(1.0, 0.68, v);
  gl_FragColor = vec4(0.102, 0.071, 0.051, a * 0.2);
}`

export type ReelMode = 'replay' | 'live'

type Anim = { expose: number[]; flash: number[]; fog: number[] }

/** The 35mm reel: frames pulled down one at a time through a lit gate. */
export class ReelScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(22, 1, 0.1, 100)
  private group = new Group()
  private film: ShaderMaterial
  private shade: ShaderMaterial
  private atlas = document.createElement('canvas')
  private texture: CanvasTexture
  private frames: FrameSpec[] = []
  private target = 0
  private offset = 0
  private velocity = 0
  private anim: Anim = { expose: Array(MAX).fill(0), flash: Array(MAX).fill(0), fog: Array(MAX).fill(0) }
  private goal: Anim = { expose: Array(MAX).fill(0), flash: Array(MAX).fill(0), fog: Array(MAX).fill(0) }
  private revealed = 0
  private replayAt = 0
  private raf = 0
  private last = 0
  private time = 0
  private running = false
  private drawn = false
  private head = -1 // replay: the absolute index of the frame last pulled into the gate
  private narrow = false

  constructor(private canvas: HTMLCanvasElement, private mode: ReelMode, private still: boolean) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
    this.renderer.outputColorSpace = LinearSRGBColorSpace // palette values are written as-is, so the strip matches the CSS
    this.renderer.setClearColor(0x000000, 0)
    this.atlas.width = CELL_W * MAX // fixed before the first upload: WebGL2 textures cannot be resized in place
    this.atlas.height = CELL_H
    this.texture = new CanvasTexture(this.atlas)
    this.texture.colorSpace = NoColorSpace
    this.texture.minFilter = LinearFilter
    this.texture.generateMipmaps = false
    this.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())

    const uniforms = {
      uAtlas: { value: this.texture }, uCount: { value: 0 }, uOffset: { value: 0 }, uPitch: { value: 1 }, uGate: { value: 0 },
      uTime: { value: 0 }, uBend: { value: still ? 0 : 0.09 }, uStripH: { value: 1 }, uLoop: { value: mode === 'replay' ? 1 : 0 },
      uExpose: { value: this.anim.expose }, uFlash: { value: this.anim.flash }, uFog: { value: this.anim.fog },
      uHead: { value: -1 }, uRefused: { value: Array(MAX).fill(0) },
    }
    this.film = new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: film })
    this.shade = new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: shadow, transparent: true, depthWrite: false })
    this.camera.position.set(0, 0, 12)
    this.group.rotation.set(-0.14, 0.05, -0.052) // tipped back on the lightbox, -3° across the page
    this.scene.add(this.group)
  }

  async setFrames(frames: FrameSpec[]): Promise<void> {
    if (!this.drawn) await fontsReady()
    const before = this.frames
    this.frames = frames.slice(0, MAX)
    drawAtlas(this.atlas, this.frames)
    this.texture.needsUpdate = true
    this.film.uniforms.uCount.value = this.frames.length
    this.film.uniforms.uRefused.value = Array.from({ length: MAX }, (_, i) => (this.frames[i]?.state === 'refused' ? 1 : 0))

    if (this.mode === 'live') {
      const decided = this.frames.filter((f) => f.state !== 'empty').length
      const first = !this.drawn
      for (let i = 0; i < this.frames.length; i++) {
        const f = this.frames[i]
        const fresh = !first && f.state !== 'empty' && before[i]?.state !== f.state
        this.reveal(i, f, first || this.still ? 'now' : fresh ? 'event' : 'keep')
      }
      this.revealed = decided
      this.target = this.liveTarget()
      if (first || this.still) { this.offset = this.target; this.velocity = 0 }
    } else if (!this.drawn) {
      this.replayAt = 0.9
    }
    this.drawn = true
    this.frame()
  }

  /** Sets a frame's develop / flash / fog goals; 'now' jumps there, 'event' plays the moment, 'keep' leaves it. */
  private reveal(i: number, f: FrameSpec, how: 'now' | 'event' | 'keep') {
    if (how === 'keep') return
    const on = f.state !== 'empty'
    this.goal.expose[i] = on ? 1 : 0
    this.goal.fog[i] = f.state === 'refused' ? 1 : 0
    if (how === 'now') { this.anim.expose[i] = this.goal.expose[i]; this.anim.fog[i] = this.goal.fog[i]; return }
    if (f.state === 'paid') this.anim.flash[i] = 1
  }

  /**
   * Where a live reel parks: on the newest frame while the agent works. Once every slot is decided on a narrow
   * screen, which shows about three frames, it parks on the refusal so the reel's one memorable moment stays in view.
   */
  private liveTarget(): number {
    const decided = this.frames.filter((f) => f.state !== 'empty').length
    const refused = this.frames.findIndex((f) => f.state === 'refused')
    if (this.narrow && decided === this.frames.length && refused >= 0) return refused
    return Math.max(0, decided - 1)
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
    const viewH = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360)
    const viewW = viewH * this.camera.aspect
    const stripH = viewH * (width < 640 ? 0.7 : 0.6)
    const pitch = stripH * PITCH_RATIO
    this.group.traverse((o) => { if (o instanceof Mesh) o.geometry.dispose() })
    this.group.clear()
    const geo = new PlaneGeometry(viewW * 1.5, stripH, 160, 1)
    const strip = new Mesh(geo, this.film)
    const under = new Mesh(new PlaneGeometry(viewW * 1.5, stripH * 1.25, 160, 1), this.shade)
    under.position.set(0.18, -stripH * 0.16, -0.5)
    this.group.add(under, strip)
    const u = this.film.uniforms
    u.uPitch.value = pitch
    u.uStripH.value = stripH
    // the gate sits right of centre on wide screens; a live reel's sits further right so every frame fits behind it
    this.narrow = width < 640
    u.uGate.value = this.narrow ? 0 : viewW * (this.mode === 'live' ? 0.2 : 0.12)
    if (this.mode === 'live' && this.drawn) { this.target = this.liveTarget(); this.offset = this.target; this.velocity = 0 }
    this.frame()
  }

  setRunning(on: boolean): void {
    if (on === this.running) return
    this.running = on
    if (on && !this.still) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick) }
    else cancelAnimationFrame(this.raf)
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    this.step(dt)
    this.frame()
    if (this.running) this.raf = requestAnimationFrame(this.tick)
  }

  private step(dt: number) {
    this.time += dt
    if (this.mode === 'replay') this.replay(dt)
    // pull-down: an underdamped spring, so each advance overshoots a hair and locks onto the pin
    const k = 70, c = 2 * 0.72 * Math.sqrt(k)
    this.velocity += (-k * (this.offset - this.target) - c * this.velocity) * dt
    this.offset += this.velocity * dt
    const ease = 1 - Math.exp(-dt * 3.2) // exponential approach: frames develop, fog lands
    for (let i = 0; i < MAX; i++) {
      this.anim.expose[i] += (this.goal.expose[i] - this.anim.expose[i]) * ease
      this.anim.fog[i] += (this.goal.fog[i] - this.anim.fog[i]) * ease * 0.8
      this.anim.flash[i] *= Math.exp(-dt * 2.4)
    }
  }

  /**
   * Start page: replays a real reel, one frame through the gate every 2.4 s, forever. Frames behind the gate stay
   * developed (the shader reads them from uRefused); only the frame entering the gate replays its moment.
   */
  private replay(dt: number) {
    this.replayAt -= dt
    if (this.replayAt > 0) return
    const n = this.frames.length
    if (!n) return
    const i = ++this.head
    const slot = i % n
    this.anim.expose[slot] = 0
    this.anim.fog[slot] = 0
    this.reveal(slot, this.frames[slot], 'event')
    this.target = i
    this.replayAt = slot === n - 1 ? 3.6 : 2.4
  }

  private frame() {
    const u = this.film.uniforms
    u.uOffset.value = this.offset
    u.uTime.value = this.time
    u.uHead.value = this.head
    this.renderer.render(this.scene, this.camera)
  }

  /** Reduced motion: the whole reel developed and still, parked on the refusal. */
  showAll(): void {
    this.frames.forEach((f, i) => this.reveal(i, f, 'now'))
    const refused = Math.max(0, this.frames.findIndex((f) => f.state === 'refused'))
    if (this.mode === 'replay') this.head = 1e6 // every frame reads as already through the gate
    this.target = this.offset = refused
    this.frame()
  }

  dispose(): void {
    this.setRunning(false)
    this.group.traverse((o) => { if (o instanceof Mesh) o.geometry.dispose() })
    this.film.dispose(); this.shade.dispose(); this.texture.dispose(); this.renderer.dispose()
  }
}
