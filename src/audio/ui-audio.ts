export type UiSoundName = 'hover' | 'click' | 'confirm' | 'back'

export interface UiAudioOptions {
  muted?: boolean
  volume?: number
}

type AudioContextConstructor = new () => AudioContext

interface Tone {
  delay?: number
  duration: number
  endFrequency: number
  frequency: number
  gain: number
  type: OscillatorType
}

const SOUND_BANK: Readonly<Record<UiSoundName, readonly Tone[]>> = {
  hover: [
    {
      duration: 0.045,
      endFrequency: 880,
      frequency: 720,
      gain: 0.025,
      type: 'sine',
    },
  ],
  click: [
    {
      duration: 0.065,
      endFrequency: 235,
      frequency: 350,
      gain: 0.075,
      type: 'triangle',
    },
  ],
  confirm: [
    {
      duration: 0.11,
      endFrequency: 690,
      frequency: 520,
      gain: 0.06,
      type: 'sine',
    },
    {
      delay: 0.055,
      duration: 0.14,
      endFrequency: 1040,
      frequency: 780,
      gain: 0.045,
      type: 'sine',
    },
  ],
  back: [
    {
      duration: 0.12,
      endFrequency: 170,
      frequency: 430,
      gain: 0.065,
      type: 'triangle',
    },
  ],
}

const HOVER_COOLDOWN_MS = 55
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
 * A tiny procedural sound service for menu interactions.
 *
 * It creates the Web Audio graph lazily, so importing it is safe during SSR and
 * does not trigger the browser's autoplay policy. Calling `play` from a click or
 * key handler will also attempt to resume a suspended context.
 */
export class UiAudioService {
  private context: AudioContext | null = null
  private disposed = false
  private lastHoverTime = -Infinity
  private masterGain: GainNode | null = null
  private mutedValue: boolean
  private volumeValue: number

  constructor(options: UiAudioOptions = {}) {
    this.mutedValue = options.muted ?? false
    this.volumeValue = clampUnit(options.volume ?? 0.65)
  }

  get isMuted(): boolean {
    return this.mutedValue
  }

  get isSupported(): boolean {
    return getAudioContextConstructor() !== null
  }

  get volume(): number {
    return this.volumeValue
  }

  configure(options: UiAudioOptions): void {
    if (options.muted !== undefined) {
      this.mutedValue = options.muted
    }

    if (options.volume !== undefined) {
      this.volumeValue = clampUnit(options.volume)
    }

    this.updateMasterGain()
  }

  setMuted(muted: boolean): void {
    this.configure({ muted })
  }

  setVolume(volume: number): void {
    this.configure({ volume })
  }

  /** Attempt to unlock audio from a pointer or keyboard gesture. */
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

    return context.state === 'running'
  }

  play(sound: UiSoundName): void {
    if (this.disposed || this.mutedValue || this.volumeValue === 0) {
      return
    }

    if (sound === 'hover') {
      const now = performance.now()

      if (now - this.lastHoverTime < HOVER_COOLDOWN_MS) {
        return
      }

      this.lastHoverTime = now
    }

    const context = this.ensureContext()

    if (!context) {
      return
    }

    if (context.state === 'running') {
      this.scheduleSound(context, sound)
      return
    }

    if (context.state === 'suspended') {
      void context
        .resume()
        .then(() => {
          if (!this.disposed && context.state === 'running') {
            this.scheduleSound(context, sound)
          }
        })
        .catch(() => {
          // Autoplay can reject until the next genuine user gesture. A later
          // call to play/unlock will retry without leaving a rejected promise.
        })
    }
  }

  /** Release the Web Audio graph. Safe to call more than once. */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.masterGain?.disconnect()
    this.masterGain = null

    const context = this.context
    this.context = null

    if (context && context.state !== 'closed') {
      void context.close().catch(() => {
        // Closing may fail while a document is being torn down. There is no
        // useful recovery action once the service has been disposed.
      })
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
      const masterGain = context.createGain()
      masterGain.gain.value = this.effectiveVolume
      masterGain.connect(context.destination)
      this.context = context
      this.masterGain = masterGain
      return context
    } catch {
      return null
    }
  }

  private get effectiveVolume(): number {
    return this.mutedValue ? 0 : this.volumeValue
  }

  private scheduleSound(context: AudioContext, sound: UiSoundName): void {
    const output = this.masterGain

    if (!output || this.mutedValue || this.disposed) {
      return
    }

    const startTime = context.currentTime + 0.004

    for (const tone of SOUND_BANK[sound]) {
      try {
        const oscillator = context.createOscillator()
        const envelope = context.createGain()
        const toneStart = startTime + (tone.delay ?? 0)
        const attackEnd = toneStart + Math.min(0.012, tone.duration * 0.2)
        const toneEnd = toneStart + tone.duration

        oscillator.type = tone.type
        oscillator.frequency.setValueAtTime(tone.frequency, toneStart)
        oscillator.frequency.exponentialRampToValueAtTime(
          tone.endFrequency,
          toneEnd,
        )

        envelope.gain.setValueAtTime(MIN_GAIN, toneStart)
        envelope.gain.exponentialRampToValueAtTime(tone.gain, attackEnd)
        envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, toneEnd)

        oscillator.connect(envelope)
        envelope.connect(output)
        oscillator.addEventListener(
          'ended',
          () => {
            oscillator.disconnect()
            envelope.disconnect()
          },
          { once: true },
        )
        oscillator.start(toneStart)
        oscillator.stop(toneEnd + 0.01)
      } catch {
        // Ignore graph errors caused by a context closing mid-frame.
      }
    }
  }

  private updateMasterGain(): void {
    if (!this.context || !this.masterGain) {
      return
    }

    this.masterGain.gain.setTargetAtTime(
      this.effectiveVolume,
      this.context.currentTime,
      0.015,
    )
  }
}

export const uiAudio = new UiAudioService()

/**
 * Registers one-shot gesture listeners that unlock the shared audio context.
 * Returns a cleanup function for React effects.
 */
export function installUiAudioUnlock(
  service: UiAudioService = uiAudio,
  eventTarget?: EventTarget,
): () => void {
  const target =
    eventTarget ?? (typeof document === 'undefined' ? null : document)

  if (!target) {
    return () => undefined
  }

  let listening = true
  const eventOptions: AddEventListenerOptions = {
    capture: true,
    passive: true,
  }

  const cleanup = (): void => {
    if (!listening) {
      return
    }

    listening = false
    target.removeEventListener('pointerdown', handleGesture, true)
    target.removeEventListener('keydown', handleGesture, true)
    target.removeEventListener('touchstart', handleGesture, true)
  }

  const handleGesture = (): void => {
    void service.unlock().then((unlocked) => {
      if (unlocked) {
        cleanup()
      }
    })
  }

  target.addEventListener('pointerdown', handleGesture, eventOptions)
  target.addEventListener('keydown', handleGesture, eventOptions)
  target.addEventListener('touchstart', handleGesture, eventOptions)

  return cleanup
}
