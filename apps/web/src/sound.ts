export type Cue = 'tick' | 'press' | 'advance' | 'paid' | 'refused' | 'done' | 'payout'
const KEY = 'clippass.sound'
let preference: boolean | undefined
let context: AudioContext | undefined
let master: GainNode | undefined
let unlocked = false
let wantsHum = false
let hum: { source: AudioBufferSourceNode; flutter: OscillatorNode; gain: GainNode } | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(fn => { try { fn() } catch {} })
function enabled() {
  if (preference === undefined) {
    try { preference = localStorage.getItem(KEY) !== 'off' } catch { preference = true }
  }
  return preference
}
function audio(): AudioContext | undefined {
  if (!enabled() || !unlocked) return
  try {
    if (!context) {
      context = new AudioContext()
      master = context.createGain()
      master.gain.value = 0.3
      master.connect(context.destination)
    }
    return context
  } catch { return }
}
function noise(c: AudioContext, at: number, duration: number, level: number, frequency: number, type: BiquadFilterType = 'lowpass') {
  const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain()
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  source.buffer = buffer; filter.type = type; filter.frequency.value = frequency
  gain.gain.setValueAtTime(level, at); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  source.connect(filter); filter.connect(gain); gain.connect(master!)
  source.start(at); source.stop(at + duration)
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
}
function tone(c: AudioContext, at: number, frequency: number, duration: number, level: number) {
  const source = c.createOscillator(), gain = c.createGain()
  source.type = 'sine'; source.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(level, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  source.connect(gain); gain.connect(master!); source.start(at); source.stop(at + duration)
  source.onended = () => { source.disconnect(); gain.disconnect() }
}
function advance(c: AudioContext, at: number) {
  tone(c, at, 95, 0.13, 0.16)
  noise(c, at + 0.015, 0.025, 0.14, 1700)
  noise(c, at + 0.065, 0.035, 0.1, 1300)
}
function play(name: Cue) {
  try {
    const c = audio(); if (!c || c.state !== 'running') return
    const at = c.currentTime
    if (name === 'tick') noise(c, at, 0.035, 0.12, 1800)
    if (name === 'press') { noise(c, at, 0.07, 0.18, 1400); tone(c, at, 125, 0.1, 0.1) }
    if (name === 'advance' || name === 'paid') advance(c, at)
    if (name === 'paid') { tone(c, at + 0.08, 330, 0.25, 0.12); tone(c, at + 0.21, 440, 0.3, 0.1) }
    if (name === 'refused') { tone(c, at, 70, 0.2, 0.2); noise(c, at + 0.04, 0.16, 0.15, 700, 'bandpass') }
    if (name === 'done') [262, 330, 440].forEach((hz, i) => tone(c, at + i * 0.14, hz, 0.32, 0.13))
    if (name === 'payout') [1000, 1300, 1600, 1900].forEach((hz, i) => noise(c, at + i * 0.065, 0.03, 0.12, hz))
  } catch { /* Every public audio call is a silent no-op when unsupported. */ }
}
function stopHum() {
  wantsHum = false
  try { hum?.source.stop(); hum?.flutter.stop(); hum?.gain.disconnect() } catch {}
  hum = undefined
}
function startHum() {
  wantsHum = true
  try {
    const c = audio(); if (!c || c.state !== 'running' || hum) return
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(), flutter = c.createOscillator(), depth = c.createGain()
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = 350
    gain.gain.value = 0.025; flutter.frequency.value = 4; depth.gain.value = 0.006
    flutter.connect(depth); depth.connect(gain.gain); source.connect(filter); filter.connect(gain); gain.connect(master!)
    source.start(); flutter.start(); hum = { source, flutter, gain }
    source.onended = () => { source.disconnect(); filter.disconnect(); depth.disconnect(); flutter.disconnect() }
  } catch {}
}
function setEnabled(value: boolean) {
  preference = value
  try { localStorage.setItem(KEY, value ? 'on' : 'off') } catch {}
  try { if (master && context) master.gain.setValueAtTime(value ? 0.3 : 0, context.currentTime) } catch {}
  const running = wantsHum
  if (!value) { stopHum(); wantsHum = running }
  else if (running) startHum()
  notify()
}
function unlock() {
  unlocked = true
  try {
    const c = audio()
    if (c) void c.resume().then(() => { if (wantsHum) startHum(); notify() }).catch(() => {})
  } catch {}
  notify()
}
export const sound = {
  play, enabled, setEnabled, unlock, startHum, stopHum,
  isUnlocked: () => unlocked && (!context || context.state === 'running'),
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
}
