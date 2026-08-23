const DEFAULT_MASTER_VOLUME = 0.72
const ENGINE_RESPONSE_SECONDS = 0.08

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext

interface BrowserAudioGlobals {
  AudioContext?: AudioContextConstructor
  webkitAudioContext?: AudioContextConstructor
}

export interface LevelOneEngineAudioState {
  /** Aircraft true airspeed in metres per second. */
  airspeed: number
  running: boolean
  /** Normalized engine throttle, from 0 to 1. */
  throttle: number
}

export interface LevelOneAudioOptions {
  enabled?: boolean
  masterVolume?: number
}

export interface LevelOneAudio {
  readonly available: boolean
  dispose(): void
  pause(): Promise<void>
  playCheckpoint(): void
  playCrash(): void
  playSuccess(): void
  reset(): void
  resume(): Promise<boolean>
  setEngineState(state: LevelOneEngineAudioState): void
  setMasterVolume(volume: number): void
  setMuted(muted: boolean): void
  startEngine(): void
  stopEngine(): void
  /** Creates and resumes the AudioContext. Call from a user gesture. */
  unlock(): Promise<boolean>
}

interface EngineGraph {
  bus: GainNode
  engineGain: GainNode
  engineOscillator: OscillatorNode
  engineOvertone: OscillatorNode
  filter: BiquadFilterNode
  windGain: GainNode
  windSource: AudioBufferSourceNode
}

interface FireGraph {
  gain: GainNode
  source: AudioBufferSourceNode
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))

const getAudioContextConstructor = (): AudioContextConstructor | undefined => {
  const audioGlobals = globalThis as typeof globalThis & BrowserAudioGlobals
  return audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext
}

const silenceParam = (param: AudioParam, now: number, duration = 0.04) => {
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(0.0001, now + duration)
}

/**
 * Procedural Level 1 soundscape. It owns every Web Audio node it creates and
 * keeps the context lazy so loading the game never triggers autoplay warnings.
 */
export class ProceduralLevelOneAudio implements LevelOneAudio {
  private activeOneShots = new Set<AudioScheduledSourceNode>()
  private compressor: DynamicsCompressorNode | undefined
  private context: AudioContext | undefined
  private desiredEngine: LevelOneEngineAudioState = {
    airspeed: 0,
    running: false,
    throttle: 0,
  }
  private disposed = false
  private enabled: boolean
  private engine: EngineGraph | undefined
  private fire: FireGraph | undefined
  private master: GainNode | undefined
  private masterVolume: number
  private muted = false
  private paused = false
  private session = 0
  private unlockPromise: Promise<boolean> | undefined

  constructor(options: LevelOneAudioOptions = {}) {
    this.enabled = options.enabled ?? true
    this.masterVolume = clamp(
      options.masterVolume ?? DEFAULT_MASTER_VOLUME,
      0,
      1,
    )
  }

  get available() {
    return this.enabled && getAudioContextConstructor() !== undefined
  }

  unlock(): Promise<boolean> {
    if (this.disposed || !this.available) {
      return Promise.resolve(false)
    }

    if (this.unlockPromise) {
      return this.unlockPromise
    }

    const context = this.ensureContext()
    if (!context) {
      return Promise.resolve(false)
    }

    this.unlockPromise = (async () => {
      try {
        if (context.state === 'suspended') {
          await context.resume()
        }

        if (this.paused && context.state === 'running') {
          await context.suspend()
          return false
        }

        if (context.state !== 'running') {
          return false
        }

        this.ensureEngineGraph(context)
        this.applyMasterVolume()
        this.applyEngineState(false)
        return true
      } catch {
        return false
      } finally {
        this.unlockPromise = undefined
      }
    })()

    return this.unlockPromise
  }

  resume(): Promise<boolean> {
    this.paused = false
    return this.unlock()
  }

  async pause(): Promise<void> {
    if (this.disposed || this.paused) {
      return
    }

    this.paused = true
    const context = this.context
    if (!context || context.state !== 'running') {
      return
    }

    try {
      await context.suspend()
    } catch {
      // Audio is optional; a browser denying suspend must not break gameplay.
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = clamp(volume, 0, 1)
    this.applyMasterVolume()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.applyMasterVolume()
  }

  setEngineState(state: LevelOneEngineAudioState) {
    const wasRunning = this.desiredEngine.running
    this.desiredEngine = {
      airspeed: Math.max(0, Number.isFinite(state.airspeed) ? state.airspeed : 0),
      running: state.running,
      throttle: clamp(state.throttle, 0, 1),
    }

    if (state.running && !wasRunning) {
      this.startEngineSound()
    }

    this.applyEngineState(true)
  }

  startEngine() {
    if (this.desiredEngine.running) {
      return
    }

    this.desiredEngine = { ...this.desiredEngine, running: true }
    this.startEngineSound()
    this.applyEngineState(true)
  }

  stopEngine() {
    this.desiredEngine = { ...this.desiredEngine, running: false }
    this.applyEngineState(true)
  }

  playCheckpoint() {
    this.scheduleWhenAudible((context) => {
      const start = context.currentTime
      this.playTone(context, 740, start, 0.13, 0.105, 'sine')
      this.playTone(context, 1110, start + 0.09, 0.22, 0.09, 'sine')
    })
  }

  playCrash() {
    this.session += 1
    this.desiredEngine = { ...this.desiredEngine, running: false }
    this.applyEngineState(true)
    this.stopOneShots()
    this.stopFire()

    this.scheduleWhenAudible((context) => {
      const start = context.currentTime
      const impact = context.createOscillator()
      const impactGain = context.createGain()
      impact.type = 'triangle'
      impact.frequency.setValueAtTime(92, start)
      impact.frequency.exponentialRampToValueAtTime(28, start + 0.42)
      impactGain.gain.setValueAtTime(0.34, start)
      impactGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48)
      impact.connect(impactGain).connect(this.getMasterNode(context))
      this.startOneShot(impact, start, start + 0.5)

      const noiseSource = context.createBufferSource()
      const noiseFilter = context.createBiquadFilter()
      const noiseGain = context.createGain()
      noiseSource.buffer = this.createNoiseBuffer(context, 0.85, 'impact')
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.setValueAtTime(2800, start)
      noiseFilter.frequency.exponentialRampToValueAtTime(210, start + 0.8)
      noiseGain.gain.setValueAtTime(0.48, start)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.82)
      noiseSource.connect(noiseFilter).connect(noiseGain).connect(this.getMasterNode(context))
      this.startOneShot(noiseSource, start, start + 0.85)

      this.startFire(context, start + 0.17)
    })
  }

  playSuccess() {
    this.stopFire()
    this.scheduleWhenAudible((context) => {
      const start = context.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5]
      for (const [index, frequency] of notes.entries()) {
        this.playTone(
          context,
          frequency,
          start + index * 0.13,
          index === notes.length - 1 ? 0.62 : 0.24,
          0.09,
          'triangle',
        )
      }
    })
  }

  reset() {
    if (this.disposed) {
      return
    }

    this.session += 1
    this.desiredEngine = { airspeed: 0, running: false, throttle: 0 }
    this.stopOneShots()
    this.stopFire()
    this.applyEngineState(false)
  }

  dispose() {
    if (this.disposed) {
      return
    }

    this.reset()
    this.disposed = true
    this.session += 1

    const engine = this.engine
    if (engine) {
      try {
        engine.engineOscillator.stop()
        engine.engineOvertone.stop()
        engine.windSource.stop()
      } catch {
        // Sources may already be stopped if the browser closed the context.
      }
      engine.bus.disconnect()
      engine.engineGain.disconnect()
      engine.filter.disconnect()
      engine.windGain.disconnect()
      this.engine = undefined
    }

    this.master?.disconnect()
    this.compressor?.disconnect()
    this.master = undefined
    this.compressor = undefined

    const context = this.context
    this.context = undefined
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined)
    }
  }

  private ensureContext() {
    if (this.context || this.disposed || !this.available) {
      return this.context
    }

    const AudioContextClass = getAudioContextConstructor()
    if (!AudioContextClass) {
      return undefined
    }

    try {
      const context = new AudioContextClass({ latencyHint: 'interactive' })
      const compressor = context.createDynamicsCompressor()
      const master = context.createGain()
      compressor.threshold.value = -12
      compressor.knee.value = 16
      compressor.ratio.value = 5
      compressor.attack.value = 0.003
      compressor.release.value = 0.18
      master.gain.value = this.muted ? 0 : this.masterVolume
      master.connect(compressor).connect(context.destination)

      this.context = context
      this.compressor = compressor
      this.master = master
      return context
    } catch {
      return undefined
    }
  }

  private ensureEngineGraph(context: AudioContext) {
    if (this.engine) {
      return this.engine
    }

    const bus = context.createGain()
    const engineGain = context.createGain()
    const filter = context.createBiquadFilter()
    const engineOscillator = context.createOscillator()
    const engineOvertone = context.createOscillator()
    const overtoneGain = context.createGain()
    const windSource = context.createBufferSource()
    const windFilter = context.createBiquadFilter()
    const windGain = context.createGain()

    bus.gain.value = 0.9
    engineGain.gain.value = 0.0001
    filter.type = 'lowpass'
    filter.frequency.value = 900
    filter.Q.value = 1.2
    engineOscillator.type = 'sawtooth'
    engineOscillator.frequency.value = 48
    engineOvertone.type = 'triangle'
    engineOvertone.frequency.value = 96
    engineOvertone.detune.value = 7
    overtoneGain.gain.value = 0.22

    windSource.buffer = this.createNoiseBuffer(context, 1.5, 'wind')
    windSource.loop = true
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 950
    windFilter.Q.value = 0.6
    windGain.gain.value = 0.0001

    engineOscillator.connect(filter)
    engineOvertone.connect(overtoneGain).connect(filter)
    filter.connect(engineGain).connect(bus)
    windSource.connect(windFilter).connect(windGain).connect(bus)
    bus.connect(this.getMasterNode(context))

    engineOscillator.start()
    engineOvertone.start()
    windSource.start()

    this.engine = {
      bus,
      engineGain,
      engineOscillator,
      engineOvertone,
      filter,
      windGain,
      windSource,
    }
    return this.engine
  }

  private applyMasterVolume() {
    const context = this.context
    const master = this.master
    if (!context || !master) {
      return
    }

    const now = context.currentTime
    const target = this.muted ? 0.0001 : Math.max(0.0001, this.masterVolume)
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(target, now + 0.025)
  }

  private applyEngineState(smooth: boolean) {
    const context = this.context
    const engine = this.engine
    if (!context || !engine) {
      return
    }

    const now = context.currentTime
    const transition = smooth ? ENGINE_RESPONSE_SECONDS : 0.015
    const throttle = this.desiredEngine.throttle
    const speedRatio = clamp(this.desiredEngine.airspeed / 90, 0, 1.4)
    const running = this.desiredEngine.running
    const fundamental = 44 + throttle * 94 + speedRatio * 11
    const engineVolume = running ? 0.055 + throttle * 0.135 : 0.0001
    const windVolume = 0.0001 + speedRatio * speedRatio * 0.07

    this.rampParam(engine.engineOscillator.frequency, fundamental, now, transition)
    this.rampParam(engine.engineOvertone.frequency, fundamental * 2.02, now, transition)
    this.rampParam(engine.filter.frequency, 560 + throttle * 1500, now, transition)
    this.rampParam(engine.engineGain.gain, engineVolume, now, running ? transition : 0.16)
    this.rampParam(engine.windGain.gain, windVolume, now, transition)
  }

  private rampParam(param: AudioParam, value: number, now: number, duration: number) {
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(value, now + duration)
  }

  private startEngineSound() {
    this.scheduleWhenAudible((context) => {
      const start = context.currentTime
      const starter = context.createOscillator()
      const starterGain = context.createGain()
      const starterFilter = context.createBiquadFilter()
      starter.type = 'sawtooth'
      starter.frequency.setValueAtTime(24, start)
      starter.frequency.exponentialRampToValueAtTime(76, start + 0.68)
      starterFilter.type = 'lowpass'
      starterFilter.frequency.setValueAtTime(280, start)
      starterFilter.frequency.linearRampToValueAtTime(1050, start + 0.68)
      starterGain.gain.setValueAtTime(0.0001, start)
      starterGain.gain.exponentialRampToValueAtTime(0.15, start + 0.08)
      starterGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.76)
      starter.connect(starterFilter).connect(starterGain).connect(this.getMasterNode(context))
      this.startOneShot(starter, start, start + 0.78)
      this.applyEngineState(true)
    })
  }

  private scheduleWhenAudible(play: (context: AudioContext) => void) {
    if (this.disposed || this.paused || !this.available) {
      return
    }

    const session = this.session
    void this.unlock().then((unlocked) => {
      const context = this.context
      if (
        !unlocked ||
        !context ||
        this.disposed ||
        this.paused ||
        session !== this.session
      ) {
        return
      }
      play(context)
    })
  }

  private playTone(
    context: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(this.getMasterNode(context))
    this.startOneShot(oscillator, start, start + duration + 0.02)
  }

  private startOneShot(
    source: AudioScheduledSourceNode,
    start: number,
    stop: number,
  ) {
    this.activeOneShots.add(source)
    source.addEventListener(
      'ended',
      () => {
        this.activeOneShots.delete(source)
        source.disconnect()
      },
      { once: true },
    )
    source.start(start)
    source.stop(stop)
  }

  private stopOneShots() {
    for (const source of this.activeOneShots) {
      try {
        source.stop()
      } catch {
        // A source that ended between iteration and stop is already clean.
      }
      source.disconnect()
    }
    this.activeOneShots.clear()
  }

  private startFire(context: AudioContext, start: number) {
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = this.createNoiseBuffer(context, 1.4, 'fire')
    source.loop = true
    filter.type = 'lowpass'
    filter.frequency.value = 1300
    filter.Q.value = 0.45
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.25)
    source.connect(filter).connect(gain).connect(this.getMasterNode(context))
    source.start(start)
    this.fire = { gain, source }
  }

  private stopFire() {
    const fire = this.fire
    if (!fire) {
      return
    }

    const context = this.context
    if (context && context.state !== 'closed') {
      silenceParam(fire.gain.gain, context.currentTime, 0.04)
    }
    try {
      fire.source.stop(context ? context.currentTime + 0.05 : undefined)
    } catch {
      // The crash loop may not have reached its scheduled start yet.
    }
    fire.source.disconnect()
    fire.gain.disconnect()
    this.fire = undefined
  }

  private createNoiseBuffer(
    context: AudioContext,
    duration: number,
    character: 'fire' | 'impact' | 'wind',
  ) {
    const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const samples = buffer.getChannelData(0)
    let smoothed = 0

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1
      if (character === 'impact') {
        const envelope = 1 - index / frameCount
        samples[index] = white * envelope * envelope
      } else if (character === 'fire') {
        smoothed = smoothed * 0.82 + white * 0.18
        const crackle = Math.random() > 0.996 ? white * 1.8 : 0
        samples[index] = clamp(smoothed * 0.75 + crackle, -1, 1)
      } else {
        smoothed = smoothed * 0.7 + white * 0.3
        samples[index] = smoothed * 0.58
      }
    }

    return buffer
  }

  private getMasterNode(context: AudioContext) {
    return this.master ?? context.destination
  }
}

export const createLevelOneAudio = (options?: LevelOneAudioOptions): LevelOneAudio =>
  new ProceduralLevelOneAudio(options)
