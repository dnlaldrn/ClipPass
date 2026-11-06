import { useEffect, useRef, useState } from 'react'
import { DEMO_REEL } from './reel/demo'
import { sound } from './sound'

// Peak amplitudes measured from the bundled eight-second preview.
const PEAKS = [
  27, 18, 15, 13, 8, 34, 20, 15, 10, 8, 35, 16, 14, 11, 6, 33, 19, 15, 10, 7,
  35, 17, 12, 10, 7, 33, 17, 15, 12, 8, 38, 17, 13, 10, 7, 34, 19, 15, 10, 7,
  36, 17, 13, 10, 7, 32, 17, 15, 10, 7, 31, 18, 18, 10, 7, 36, 17, 16, 11, 6,
  34, 18, 15, 10, 7, 36, 17, 14, 12, 7, 34, 17, 13, 11, 8, 37, 17, 15, 10, 6,
]

export function MusicHero() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(() => !sound.enabled())
  const [failed, setFailed] = useState(false)
  useEffect(() => sound.subscribe(() => setMuted(!sound.enabled())), [])

  async function togglePreview() {
    const clip = audio.current
    if (!clip) return
    if (!clip.paused) { clip.pause(); return }
    if (clip.ended) clip.currentTime = 0
    try { await clip.play(); setFailed(false) }
    catch { setFailed(true) }
  }

  return <section className="music-hero" aria-labelledby="music-title">
    <header className="music-hero-head">
      <div>
        <p>ClipPass Studio · Demo audio</p>
        <h2 id="music-title">Midnight Market</h2>
      </div>
      <img className={playing ? 'music-disc is-playing' : 'music-disc'} src="/midnight-market-disc.webp" alt="" width="384" height="384" />
    </header>
    <div className="music-timeline">
      <div className="music-ruler" aria-hidden="true"><span>0:00</span><span>0:02</span><span>0:04</span><span>0:06</span><span>0:08</span></div>
      <div className="music-wave">
        <svg viewBox="0 0 800 100" preserveAspectRatio="none" aria-hidden="true">
          {PEAKS.map((peak, i) => <line key={i} x1={i * 10 + 5} x2={i * 10 + 5} y1={50 - peak} y2={50 + peak} />)}
        </svg>
        <span className="music-playhead" style={{ left: `${progress * 100}%` }} aria-hidden="true" />
      </div>
      <div className="music-lane music-sfx"><span>SFX</span><span>Rain texture</span><span>Percussion</span></div>
      <div className="music-lane music-frames"><span>B-roll</span>{DEMO_REEL.filter(frame => frame.type === 'broll').map(frame => <span key={frame.key}>{frame.title}</span>)}</div>
    </div>
    <div className="music-transport">
      <button type="button" onClick={() => void togglePreview()}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span> {playing ? 'Pause preview' : 'Play preview'}</button>
      <span>8 sec · {muted ? 'Sound muted' : 'Original demo mix'}</span>
    </div>
    {failed && <p className="error" role="status">Preview couldn’t play. Try again.</p>}
    <audio ref={audio} src="/midnight-market.mp3" preload="none" muted={muted}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={({ currentTarget }) => setProgress(currentTarget.duration ? currentTarget.currentTime / currentTarget.duration : 0)} />
  </section>
}
