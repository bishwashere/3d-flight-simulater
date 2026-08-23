export interface GameAmbienceOptions {
  enabled?: boolean
  volume?: number
}

type AudioContextConstructor = new () => AudioContext

const SCORE_LEVEL = 0.16
const MIN_GAIN = 0.0001

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const browserWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor
  }

  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null
}

/**
 * A low-cost procedural menu/world score. It uses a quiet filtered drone,
 * sub-bass pulse, and coastal wind bed, so no copyrighted audio asset or
 * network request is required.
 */
export class GameAmbienceService {
  private context: AudioContext | null = null
  private disposed = false
  private enabledValue: boolean
  private scoreGain: GainNode | null = null
  private sources: AudioScheduledSourceNode[] = []
  private volumeValue: number

  constructor(options: GameAmbienceOptions = {}) {
    this.enabledValue = options.enabled ?? true
    this.volumeValue = clampUnit(options.volume ?? 0.7)
  }

  get enabled(): boolean {
    return this.enabledValue
  }

  get isSupported(): boolean {
    return getAudioContextConstructor() !== null
  }

  get volume(): number {
    return this.volumeValue
  }

  configure(options: GameAmbienceOptions): void {
    if (options.enabled !== undefined) {
      this.enabledValue = options.enabled
    }

    if (options.volume !== undefined) {
      this.volumeValue = clampUnit(options.volume)
    }

    this.updateGain()
  }

  async unlock(): Promise<boolean> {
    const context = this.ensureContext()

    if (!context) {
      return false
    }

    if (context.state === 'suspended') {
      try {
        await context.resume()
      } catch {
        return false
      }
    }

    if (context.state === 'running') {
      this.startScore(context)
      this.updateGain()
      return true
    }

    return false
  }

  async setPageHidden(hidden: boolean): Promise<void> {
    const context = this.context

    if (!context || context.state === 'closed') {
      return
    }

    try {
      if (hidden && context.state === 'running') {
        await context.suspend()
      } else if (!hidden && context.state === 'suspended') {
        await context.resume()
      }
    } catch {
      // Browsers may reject resume until another user gesture. The installed
      // gesture listener will retry without leaving the audio graph broken.
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // A source can already be stopped while the document is tearing down.
      }
      source.disconnect()
    }

    this.sources = []
    this.scoreGain?.disconnect()
    this.scoreGain = null

    const context = this.context
    this.context = null

    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined)
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) {
      return null
    }

    if (this.context) {
      return this.context
    }

    const Context = getAudioContextConstructor()

    if (!Context) {
      return null
    }

    try {
      const context = new Context()
      const scoreGain = context.createGain()
      scoreGain.gain.value = MIN_GAIN
      scoreGain.connect(context.destination)
      this.context = context
      this.scoreGain = scoreGain
      return context
    } catch {
      return null
    }
  }

  private startScore(context: AudioContext): void {
    if (this.sources.length > 0 || !this.scoreGain) {
      return
    }

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 620
    filter.Q.value = 0.7
    filter.connect(this.scoreGain)

    const chord = [82.41, 123.47, 164.81, 246.94] as const
    chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const voiceGain = context.createGain()
      oscillator.type = index < 2 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      oscillator.detune.value = index % 2 === 0 ? -4 : 5
      voiceGain.gain.value = index < 2 ? 0.085 : 0.025
      oscillator.connect(voiceGain)
      voiceGain.connect(filter)
      oscillator.start()
      this.sources.push(oscillator)
    })

    const filterLfo = context.createOscillator()
    const filterLfoDepth = context.createGain()
    filterLfo.frequency.value = 0.045
    filterLfoDepth.gain.value = 170
    filterLfo.connect(filterLfoDepth)
    filterLfoDepth.connect(filter.frequency)
    filterLfo.start()
    this.sources.push(filterLfo)

    const wind = context.createBufferSource()
    const windFilter = context.createBiquadFilter()
    const windGain = context.createGain()
    wind.buffer = this.createWindBuffer(context)
    wind.loop = true
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 330
    windFilter.Q.value = 0.45
    windGain.gain.value = 0.018
    wind.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(this.scoreGain)
    wind.start()
    this.sources.push(wind)
  }

  private createWindBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * 3))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const channel = buffer.getChannelData(0)
    let seed = 0x51f15e
    let smoothed = 0

    for (let index = 0; index < frameCount; index += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const noise = (seed / 0xffffffff) * 2 - 1
      smoothed += (noise - smoothed) * 0.035
      channel[index] = smoothed
    }

    return buffer
  }

  private updateGain(): void {
    if (!this.context || !this.scoreGain) {
      return
    }

    const target =
      this.enabledValue && this.volumeValue > 0
        ? this.volumeValue * SCORE_LEVEL
        : MIN_GAIN

    this.scoreGain.gain.setTargetAtTime(
      target,
      this.context.currentTime,
      this.enabledValue ? 0.8 : 0.12,
    )
  }
}

export const gameAmbience = new GameAmbienceService()

export function installGameAmbienceLifecycle(
  service: GameAmbienceService = gameAmbience,
  documentTarget?: Document,
): () => void {
  const target =
    documentTarget ?? (typeof document === 'undefined' ? null : document)

  if (!target) {
    return () => undefined
  }

  let waitingForGesture = true

  const removeGestureListeners = () => {
    if (!waitingForGesture) {
      return
    }

    waitingForGesture = false
    target.removeEventListener('pointerdown', handleGesture, true)
    target.removeEventListener('keydown', handleGesture, true)
    target.removeEventListener('touchstart', handleGesture, true)
  }

  const handleGesture = () => {
    void service.unlock().then((unlocked) => {
      if (unlocked) {
        removeGestureListeners()
      }
    })
  }

  const handleVisibility = () => {
    void service.setPageHidden(target.hidden)
  }

  target.addEventListener('pointerdown', handleGesture, true)
  target.addEventListener('keydown', handleGesture, true)
  target.addEventListener('touchstart', handleGesture, true)
  target.addEventListener('visibilitychange', handleVisibility)

  return () => {
    removeGestureListeners()
    target.removeEventListener('visibilitychange', handleVisibility)
  }
}
