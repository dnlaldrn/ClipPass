import { useEffect, useRef, useState } from 'react'
import type { FrameSpec } from './frames'
import type { ReelMode, ReelScene } from './ReelScene'
import { LANES } from '../mirror'
import { txLink, xlm } from '../format'

const LANE = Object.fromEntries(LANES.map((l) => [l.type, l.label]))

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * The 35mm reel band. WebGL is an enhancement: the canvas is decorative (aria-hidden) and every fact it shows
 * also lives in the page's DOM. Without WebGL the same frames render as a plain film strip.
 */
export function Reel({ frames, mode, label }: { frames: FrameSpec[]; mode: ReelMode; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ReelScene | null>(null)
  const [fallback, setFallback] = useState(false)
  const framesRef = useRef(frames)
  framesRef.current = frames

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !webglAvailable()) { setFallback(true); return }
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let disposed = false
    let ro: ResizeObserver | undefined
    let io: IntersectionObserver | undefined
    let onVisibility: (() => void) | undefined
    // three.js loads after first paint, so the form and facts never wait on it
    import('./ReelScene').then(async ({ ReelScene }) => {
      if (disposed) return
      let scene: ReelScene
      try {
        scene = new ReelScene(canvas, mode, still)
      } catch {
        setFallback(true)
        return
      }
      sceneRef.current = scene
      const box = canvas.parentElement!
      const size = () => scene.resize(box.clientWidth, box.clientHeight)
      size()
      await scene.setFrames(framesRef.current)
      if (disposed) return
      if (still) scene.showAll()
      ro = new ResizeObserver(size)
      ro.observe(box)
      let inView = true
      const update = () => scene.setRunning(inView && document.visibilityState === 'visible')
      io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update() })
      io.observe(box)
      onVisibility = update
      document.addEventListener('visibilitychange', update)
      canvas.addEventListener('webglcontextlost', () => setFallback(true), { once: true })
      update()
    })
    return () => {
      disposed = true
      ro?.disconnect()
      io?.disconnect()
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [mode])

  const sig = frames.map((f) => `${f.key}:${f.state}`).join('|')
  useEffect(() => { void sceneRef.current?.setFrames(frames) }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <figure className="reel" aria-label={label}>
      {fallback ? (
        <ol className="reel-flat">
          {frames.map((f) => (
            <li key={f.key} className={`flat is-${f.state}`}>
              <span className="flat-lane">{LANE[f.type]}</span>
              <strong>{f.title || (f.state === 'empty' ? '' : f.state)}</strong>
              {f.price && <span className="flat-price">{xlm(f.price)} XLM</span>}
            </li>
          ))}
        </ol>
      ) : (
        <canvas ref={canvasRef} className="reel-canvas" aria-hidden="true" />
      )}
      <figcaption className="reel-evidence sr-only">
        <ol>{frames.map(f => <li key={f.key}>
          {LANE[f.type]}: {f.title || f.state}. {f.artist && f.artist + '. '}
          {f.price && xlm(f.price) + ' XLM. '}{f.note && f.note + '. '}
          {f.hash && <a href={txLink(f.hash)} target="_blank" rel="noreferrer">License transaction {f.hash}</a>}
        </li>)}</ol>
      </figcaption>
    </figure>
  )
}
