import type { FrameSpec } from './frames'
import { LANES } from '../mirror'
import { xlm } from '../format'

/** Atlas geometry, in canvas px. Each frame is one cell; the strip's bands share the cell's height. */
export const CELL_W = 500
export const CELL_H = 600
export const FRAME = { x: 22, y: 132, w: 456, h: 336 } // frame window inside a cell
export const PITCH_RATIO = CELL_W / CELL_H

const INK = '#1a120d'
const PRINT = '#f1bd45'
const PAPER = '#f4efe9'
const DIM = '#cdbfb2'
const LANE = Object.fromEntries(LANES.map((l) => [l.type, l.label.toUpperCase()]))

const EDGE = '"DotGothic16", ui-monospace, monospace'
const FACE = '"Archivo Variable", "Archivo", system-ui, sans-serif'

export async function fontsReady(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`26px ${EDGE}`), document.fonts.load(`800 40px ${FACE}`), document.fonts.load(`500 26px ${FACE}`)])
  } catch {
    // shortcut: draw with fallback faces if the webfonts fail; the DOM still carries every fact
  }
}

/** Deterministic 0..1 noise from a frame key, so a frame's motif never changes between redraws. */
function rng(key: string) {
  let h = 2166136261
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number): number {
  for (let s = size; s > 18; s -= 2) {
    ctx.font = `${weight} ${s}px ${FACE}`
    if (ctx.measureText(text).width <= max) return s
  }
  return 18
}

/** The picture inside a frame: a quiet lane motif in film colours, behind the text. */
function motif(ctx: CanvasRenderingContext2D, f: FrameSpec, x: number, y: number, w: number, h: number) {
  const r = rng(f.key)
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  ctx.fillStyle = '#120c09'; ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 0.55
  if (f.type === 'music' || f.type === 'exclusive') {
    ctx.strokeStyle = f.type === 'exclusive' ? PRINT : '#c75f2a'; ctx.lineWidth = 3
    for (let k = 0; k < 6; k++) {
      ctx.beginPath()
      for (let i = 0; i <= w; i += 6) {
        const yy = y + h * (0.22 + k * 0.08) + Math.sin(i / (22 + k * 7) + r() * 6) * (10 + k * 3)
        i ? ctx.lineTo(x + i, yy) : ctx.moveTo(x + i, yy)
      }
      ctx.stroke()
    }
  } else if (f.type === 'broll') {
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(x, y + h * 0.58, w, h * 0.42)
    for (let i = 0; i < 14; i++) { ctx.fillStyle = PRINT; ctx.beginPath(); ctx.arc(x + r() * w, y + h * (0.3 + r() * 0.26), 3 + r() * 5, 0, 7); ctx.fill() }
    ctx.strokeStyle = '#8fa3ab'; ctx.lineWidth = 1.5
    for (let i = 0; i < 40; i++) { const sx = x + r() * w, sy = y + r() * h; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 6, sy + 22); ctx.stroke() }
  } else {
    ctx.fillStyle = '#c75f2a'
    for (let i = 0; i < w; i += 9) { const a = Math.exp(-((i / w - 0.35) ** 2) * 18) * (0.4 + r() * 0.6); ctx.fillRect(x + i, y + h * 0.42 - a * 70, 5, a * 140 + 2) }
  }
  ctx.restore()
}

function frame(ctx: CanvasRenderingContext2D, f: FrameSpec, i: number) {
  const x0 = i * CELL_W
  const { x, y, w, h } = FRAME
  const fx = x0 + x
  const pad = 24
  const lane = LANE[f.type] ?? f.type.toUpperCase()

  // edge print on the acetate: keycode = the license tx, frame number after it
  ctx.fillStyle = INK
  ctx.font = `26px ${EDGE}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`CLIPPASS 5219  ${f.hash ? f.hash.slice(0, 8).toUpperCase() : '--------'}  ${i + 12}`, fx, 112)
  ctx.fillText(f.state === 'refused' ? `${lane}  REFUSED BY CARD` : f.hash ? `${lane}  LICENSE TX` : lane, fx, 510)

  if (f.state === 'empty') {
    ctx.fillStyle = '#0d0907'; ctx.fillRect(fx, y, w, h)
    ctx.fillStyle = PRINT; ctx.font = `24px ${EDGE}`; ctx.fillText(lane, fx + pad, y + pad + 20)
    return
  }
  motif(ctx, f, fx, y, w, h)
  if (f.state === 'skip' || f.state === 'failed') { ctx.fillStyle = 'rgba(13,9,7,0.55)'; ctx.fillRect(fx, y, w, h) }

  ctx.fillStyle = PRINT; ctx.font = `24px ${EDGE}`; ctx.fillText(lane, fx + pad, y + pad + 20)
  const title = f.title || (f.state === 'skip' ? 'Skipped' : 'Failed')
  ctx.fillStyle = PAPER
  const size = fit(ctx, title, 800, 42, w - pad * 2)
  ctx.font = `800 ${size}px ${FACE}`
  ctx.fillText(title, fx + pad, y + h * 0.58)
  if (f.artist) { ctx.fillStyle = DIM; ctx.font = `500 26px ${FACE}`; ctx.fillText(f.artist, fx + pad, y + h * 0.58 + 38) }
  if (f.price) {
    ctx.fillStyle = PRINT; ctx.font = `700 30px ${FACE}`; ctx.textAlign = 'right'
    ctx.fillText(`${xlm(f.price)} XLM`, fx + w - pad, y + h - pad); ctx.textAlign = 'left'
  }
  if (f.state === 'skip' || f.state === 'failed') {
    // white china-marker slash: the mark stays on the film as history; red is reserved for a refusal
    ctx.strokeStyle = PAPER; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(fx + w * 0.12, y + h * 0.86); ctx.quadraticCurveTo(fx + w * 0.5, y + h * 0.5, fx + w * 0.9, y + h * 0.14); ctx.stroke()
  }
}

/**
 * Draws every frame into one canvas the strip shader samples; transparent outside the frames and edge print.
 * The canvas is sized once by the caller: WebGL2 textures are immutable, so the atlas never changes size.
 */
export function drawAtlas(canvas: HTMLCanvasElement, frames: FrameSpec[]): void {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  frames.forEach((f, i) => frame(ctx, f, i))
}
