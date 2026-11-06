import { useEffect, useRef, useState } from 'react'
import { sound } from './sound'
import { Icon } from './Icon'
export function SoundToggle({ jobPage }: { jobPage: boolean }) {
  const lockedGesture = useRef(false)
  const [, update] = useState(0)
  useEffect(() => {
    const off = sound.subscribe(() => update(n => n + 1))
    const unlock = (event: Event) => {
      // Let this button's click handle its initial unlock. Otherwise pointerdown
      // can rerender it as unlocked before click and accidentally mute it.
      if (event.target instanceof Element && event.target.closest('.sound-toggle')) return
      sound.unlock()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => { off(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])
  const on = sound.enabled(), locked = jobPage && on && !sound.isUnlocked()
  return <button type="button" className={'sound-toggle icon-button' + (locked ? ' is-locked' : '')} onPointerDown={() => { lockedGesture.current = locked }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') lockedGesture.current = locked }} aria-pressed={on} aria-label={locked ? 'Enable reel sound' : on ? 'Mute sound' : 'Enable sound'} onClick={() => {
    if (locked || lockedGesture.current) { sound.unlock(); sound.setEnabled(true) }
    else { sound.setEnabled(!on); sound.unlock() }
    lockedGesture.current = false
  }}><Icon name={on ? 'speaker' : 'muted'} /></button>
}
