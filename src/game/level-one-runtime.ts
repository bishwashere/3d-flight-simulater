import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js'
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine.js'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents.js'
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js'

import type { GameLevelDefinition } from '../config/game-levels'
import { createLevelOneEngine } from './create-level-one-engine'
import type { LevelOneEngine } from './create-level-one-engine'
import { createLevelOneScene } from './create-level-one-scene'
import type { LevelOneWorld } from './create-level-one-scene'
import {
  AircraftSimulation,
  type AircraftControlInput,
  type AircraftSimulationState,
} from './flight/aircraft-simulation'
import { createLevelOneAudio, type LevelOneAudio } from './level-one-audio'
import {
  LevelOneCourse,
  type LevelOneCourseEvent,
} from './level-one-course'
import { createLevelOneHud, type LevelOneHud } from './level-one-hud'
import { getInitialPixelRatio } from './level-one-performance'
import {
  EMPTY_LEVEL_ONE_CONTROL_INPUT,
  EMPTY_LEVEL_ONE_TELEMETRY,
  type LevelOneAssets,
  type LevelOneBackend,
  type LevelOneCameraMode,
  type LevelOneControlInput,
  type LevelOneGameStatus,
  type LevelOneTelemetry,
  type ResolvedLevelOnePerformance,
} from './level-one-types'
import {
  GEOMETRIC_AIRCRAFT_COLLISION_RADIUS,
  GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE,
} from './world/create-geometric-aircraft'

export interface LevelOneRuntimeOptions {
  assets: LevelOneAssets
  forceWebGl2?: boolean
  level: GameLevelDefinition
  masterVolume?: number
  onBackendFailure?: () => void
  onGameStatus?: (status: LevelOneGameStatus) => void
  onPauseChange?: (paused: boolean) => void
  onTelemetry?: (telemetry: LevelOneTelemetry) => void
  performance: ResolvedLevelOnePerformance
  pointerYoke?: boolean
}

const DEG_PER_RADIAN = 180 / Math.PI

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function damp(current: number, target: number, speed: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * delta))
}

export class LevelOneRuntime {
  private readonly audio: LevelOneAudio
  private readonly backend: LevelOneBackend
  private readonly basePixelRatio: number
  private readonly camera: FreeCamera
  private cameraMode: LevelOneCameraMode = 'chase'
  private readonly canvas: HTMLCanvasElement
  private controlInput: LevelOneControlInput = {
    ...EMPTY_LEVEL_ONE_CONTROL_INPUT,
  }
  private readonly course: LevelOneCourse
  private currentPixelRatio: number
  private readonly engine: LevelOneEngine
  private frameCount = 0
  private backendFailed = false
  private readonly hud: LevelOneHud
  private lastAdaptiveUpdate = globalThis.performance.now()
  private lastFrameTime = globalThis.performance.now()
  private lastStatusKey = ''
  private lastTelemetryUpdate = globalThis.performance.now()
  private readonly onGameStatus?: (status: LevelOneGameStatus) => void
  private readonly onPauseChange?: (paused: boolean) => void
  private readonly onTelemetry?: (telemetry: LevelOneTelemetry) => void
  private paused = false
  private pointerPitch = 0
  private pointerRoll = 0
  private readonly pointerYoke: boolean
  private readonly resizeObserver: ResizeObserver
  private readonly settings: ResolvedLevelOnePerformance
  private readonly simulation: AircraftSimulation
  private readonly world: LevelOneWorld
  private webGpuDevice?: GPUDevice
  private webGpuErrorHandler?: (event: GPUUncapturedErrorEvent) => void

  private constructor(
    canvas: HTMLCanvasElement,
    engine: LevelOneEngine,
    backend: LevelOneBackend,
    world: LevelOneWorld,
    camera: FreeCamera,
    hud: LevelOneHud,
    options: LevelOneRuntimeOptions,
    pixelRatio: number,
  ) {
    this.audio = createLevelOneAudio({ masterVolume: options.masterVolume })
    this.backend = backend
    this.basePixelRatio = pixelRatio
    this.camera = camera
    this.canvas = canvas
    this.course = new LevelOneCourse(world.checkpoints)
    this.currentPixelRatio = pixelRatio
    this.engine = engine
    this.hud = hud
    this.onGameStatus = options.onGameStatus
    this.onPauseChange = options.onPauseChange
    this.onTelemetry = options.onTelemetry
    this.pointerYoke = options.pointerYoke ?? false
    this.settings = options.performance
    this.world = world
    this.simulation = new AircraftSimulation({
      crashImpactSpeed: 8.5,
      gearClearance: GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE,
      spawnPosition: world.spawnPosition,
      spawnRotation: world.spawnRotation,
      terrainHeightAt: world.terrainHeightAt,
      windAt: (position, elapsedSeconds) =>
        new Vector3(
          1.8 + Math.sin(elapsedSeconds * 0.19 + position.z * 0.003) * 0.75,
          Math.sin(elapsedSeconds * 1.7 + position.x * 0.01) * 0.14,
          0.65 + Math.cos(elapsedSeconds * 0.23) * 0.35,
        ),
    })
    this.resizeObserver = new ResizeObserver(() => this.engine.resize())
    this.resizeObserver.observe(canvas)

    if (backend === 'webgpu') {
      const device = (engine as WebGPUEngine)._device
      this.webGpuDevice = device
      this.webGpuErrorHandler = (event) => {
        if (this.backendFailed) {
          return
        }
        this.backendFailed = true
        event.preventDefault()
        this.engine.stopRenderLoop(this.renderFrame)
        console.warn(
          'WebGPU became unavailable while rendering; restarting with WebGL2.',
          event.error,
        )
        options.onBackendFailure?.()
      }
      device.addEventListener('uncapturederror', this.webGpuErrorHandler)
    }

    this.resetCheckpointVisuals()
    this.syncAircraftVisual(this.simulation.state, 0)
    this.updateCamera(this.simulation.state, 1 / 60, true)
    this.attachInput()
    this.emitGameStatus(true)
    this.engine.runRenderLoop(this.renderFrame)
  }

  static async create(
    canvas: HTMLCanvasElement,
    options: LevelOneRuntimeOptions,
  ): Promise<LevelOneRuntime> {
    const { backend, engine } = await createLevelOneEngine(canvas, {
      forceWebGl2: options.forceWebGl2,
    })
    const pixelRatio = getInitialPixelRatio(options.performance)
    engine.setHardwareScalingLevel(1 / pixelRatio)

    try {
      const world = await createLevelOneScene(
        engine,
        options.performance,
        options.assets,
        options.level,
      )
      const camera = new FreeCamera(
        'level-one-flight-camera',
        world.spawnPosition.clone(),
        world.scene,
      )
      camera.minZ = 0.12
      camera.maxZ = options.performance.renderDistance
      camera.fov = 0.92
      camera.inertia = 0
      world.scene.activeCamera = camera

      const initialTelemetry: LevelOneTelemetry = {
        ...EMPTY_LEVEL_ONE_TELEMETRY,
        backend,
        checkpointCount: world.checkpoints.length,
        coinCount: world.coins.length,
        meshCount: world.scene.meshes.length,
      }
      const hud = createLevelOneHud(world.scene, initialTelemetry, options.level)
      return new LevelOneRuntime(
        canvas,
        engine,
        backend,
        world,
        camera,
        hud,
        options,
        pixelRatio,
      )
    } catch (error) {
      try {
        engine.dispose()
      } catch (cleanupError) {
        console.warn('Level 1 renderer cleanup was incomplete.', cleanupError)
      }
      if (backend === 'webgpu' && !options.forceWebGl2) {
        options.onBackendFailure?.()
      }
      throw error
    }
  }

  private attachInput(): void {
    this.world.scene.onPointerObservable.add((pointerInfo) => {
      if (
        pointerInfo.type === PointerEventTypes.POINTERDOWN &&
        pointerInfo.event.button === 0 &&
        this.pointerYoke &&
        !this.paused
      ) {
        this.requestPointerLock()
      }

      if (
        pointerInfo.type === PointerEventTypes.POINTERMOVE &&
        this.pointerYoke &&
        this.engine.isPointerLock &&
        !this.paused
      ) {
        const event = pointerInfo.event as PointerEvent
        this.pointerRoll = clamp(
          this.pointerRoll + event.movementX * 0.0028,
          -1,
          1,
        )
        this.pointerPitch = clamp(
          this.pointerPitch - event.movementY * 0.0028,
          -1,
          1,
        )
      }
    })
  }

  private readonly renderFrame = (): void => {
    const now = globalThis.performance.now()
    const deltaSeconds = clamp((now - this.lastFrameTime) / 1_000, 0, 0.1)
    this.lastFrameTime = now

    if (!this.paused) {
      this.stepGame(deltaSeconds)
    }

    this.frameCount += 1
    if (now - this.lastTelemetryUpdate >= 100) {
      this.updateTelemetry(now)
    }

    if (
      this.settings.adaptiveResolution &&
      now - this.lastAdaptiveUpdate >= 2_000
    ) {
      this.updateAdaptiveResolution(now)
    }

    this.world.scene.render()
  }

  private stepGame(deltaSeconds: number): void {
    this.pointerPitch = damp(this.pointerPitch, 0, 0.55, deltaSeconds)
    this.pointerRoll = damp(this.pointerRoll, 0, 0.55, deltaSeconds)

    const input = this.resolveSimulationInput()
    const interpolationAlpha = this.simulation.advance(deltaSeconds, input)
    this.checkWorldCollisions()
    this.processCourse(deltaSeconds)
    this.processCoinCollection()
    this.processCrash()

    const renderState = this.simulation.getInterpolatedState(interpolationAlpha)
    this.syncAircraftVisual(renderState, deltaSeconds)
    this.updateCamera(renderState, deltaSeconds)
    this.world.update(renderState.elapsedSeconds, deltaSeconds)
    this.audio.setEngineState({
      airspeed: renderState.airspeed,
      running: renderState.engineRunning,
      throttle: renderState.throttle,
    })
  }

  private resolveSimulationInput(): AircraftControlInput {
    const throttleDelta =
      Number(this.controlInput.throttleUp) -
      Number(this.controlInput.throttleDown)

    return {
      brakes: this.controlInput.brakes,
      pitch: clamp(this.controlInput.pitch + this.pointerPitch, -1, 1),
      roll: clamp(this.controlInput.roll + this.pointerRoll, -1, 1),
      throttleDelta,
      yaw: this.controlInput.yaw,
    }
  }

  private checkWorldCollisions(): void {
    const state = this.simulation.state
    if (state.crashed) {
      return
    }

    const { position } = state
    const { bounds } = this.world
    if (
      position.x < bounds.minimumX ||
      position.x > bounds.maximumX ||
      position.z < bounds.minimumZ ||
      position.z > bounds.maximumZ ||
      position.y > bounds.maximumAltitude
    ) {
      this.simulation.crash('terrain-impact')
      return
    }

    for (const obstacle of this.world.obstacles) {
      if (obstacle.kind === 'hill') {
        continue
      }

      let collision = false
      if (obstacle.halfExtents) {
        const closestX = clamp(
          position.x,
          obstacle.center.x - obstacle.halfExtents.x,
          obstacle.center.x + obstacle.halfExtents.x,
        )
        const closestY = clamp(
          position.y,
          obstacle.center.y - obstacle.halfExtents.y,
          obstacle.center.y + obstacle.halfExtents.y,
        )
        const closestZ = clamp(
          position.z,
          obstacle.center.z - obstacle.halfExtents.z,
          obstacle.center.z + obstacle.halfExtents.z,
        )
        collision =
          Vector3.DistanceSquared(
            position,
            new Vector3(closestX, closestY, closestZ),
          ) <=
          GEOMETRIC_AIRCRAFT_COLLISION_RADIUS ** 2
      } else {
        collision =
          Vector3.DistanceSquared(position, obstacle.center) <=
          (obstacle.radius + GEOMETRIC_AIRCRAFT_COLLISION_RADIUS) ** 2
      }

      if (!collision) {
        continue
      }

      const normal = position.subtract(obstacle.center)
      if (normal.lengthSquared() < 0.001) {
        normal.copyFromFloats(0, 1, 0)
      } else {
        normal.normalize()
      }
      this.simulation.registerCollision(
        Math.max(10, this.simulation.state.airspeed),
        normal,
      )
      return
    }
  }

  private processCourse(deltaSeconds: number): void {
    const state = this.simulation.state
    const event = this.course.update({
      airborne: !state.onGround,
      deltaSeconds,
      insideLandingZone: this.isInsideLandingZone(state.position),
      onGround: state.onGround,
      position: state.position,
      speed: state.airspeed,
      verticalSpeed: state.verticalSpeed,
    })

    this.handleCourseEvent(event)
  }

  private handleCourseEvent(event: LevelOneCourseEvent | undefined): void {
    if (!event) {
      return
    }

    if (event.type === 'checkpoint') {
      this.audio.playCheckpoint()
      this.updateCheckpointVisuals()
    } else if (event.type === 'complete') {
      this.simulation.setThrottle(0)
      this.updateCheckpointVisuals()
      this.audio.playSuccess()
    }
    this.emitGameStatus(true)
  }

  private processCoinCollection(): void {
    const state = this.simulation.state
    if (state.crashed) {
      return
    }

    for (const coin of this.world.coins) {
      if (coin.collected) {
        continue
      }

      const collectionRadius =
        coin.radius + GEOMETRIC_AIRCRAFT_COLLISION_RADIUS
      if (
        Vector3.DistanceSquared(state.position, coin.root.position) >
        collectionRadius ** 2
      ) {
        continue
      }

      const event = this.course.collectCoin(coin.id, coin.value)
      if (!event || !coin.collect()) {
        continue
      }

      this.audio.playCoin()
      this.emitGameStatus(true)
      return
    }
  }

  private processCrash(): void {
    const state = this.simulation.state
    const snapshot = this.course.getSnapshot(state.position)
    if (
      !state.crashed ||
      snapshot.phase === 'crashed' ||
      snapshot.phase === 'complete'
    ) {
      return
    }

    this.course.crash()
    this.cameraMode = 'chase'
    this.setAircraftVisibility(true)
    this.world.aircraft.setCrashState(true)
    this.world.showCrashEffects(state.position, state.velocity)
    this.audio.playCrash()
    this.emitGameStatus(true)
  }

  private isInsideLandingZone(position: Vector3): boolean {
    const zone = this.world.landingZone
    const offsetX = position.x - zone.center.x
    const offsetZ = position.z - zone.center.z
    const sine = Math.sin(zone.headingRadians)
    const cosine = Math.cos(zone.headingRadians)
    const alongRunway = offsetX * sine + offsetZ * cosine
    const acrossRunway = offsetX * cosine - offsetZ * sine
    return (
      Math.abs(alongRunway) <= zone.halfLength &&
      Math.abs(acrossRunway) <= zone.halfWidth
    )
  }

  private syncAircraftVisual(
    state: AircraftSimulationState,
    deltaSeconds: number,
  ): void {
    this.world.aircraft.root.position.copyFrom(state.position)
    if (!this.world.aircraft.root.rotationQuaternion) {
      this.world.aircraft.root.rotationQuaternion = Quaternion.Identity()
    }
    this.world.aircraft.root.rotationQuaternion.copyFrom(state.rotation)
    this.world.aircraft.root.computeWorldMatrix(true)
    this.world.aircraft.updateAnimations(
      {
        engineRunning: state.engineRunning,
        gearRetraction: 0,
        pitch: this.controlInput.pitch,
        roll: this.controlInput.roll,
        throttle: state.throttle,
        yaw: this.controlInput.yaw,
      },
      deltaSeconds,
    )
  }

  private updateCamera(
    state: AircraftSimulationState,
    deltaSeconds: number,
    immediate = false,
  ): void {
    const forward = Vector3.Forward()
    const up = Vector3.Up()
    forward.rotateByQuaternionToRef(state.rotation, forward)
    up.rotateByQuaternionToRef(state.rotation, up)

    let desiredPosition: Vector3
    let target: Vector3
    if (this.cameraMode === 'cockpit') {
      desiredPosition = state.position
        .add(forward.scale(2.1))
        .add(up.scale(1.05))
      target = desiredPosition.add(forward.scale(90)).add(up.scale(0.2))
    } else {
      desiredPosition = state.position
        .subtract(forward.scale(17.5))
        .add(up.scale(5.6))
        .add(Vector3.Up().scale(1.8))
      target = state.position.add(forward.scale(13)).add(up.scale(1.2))
    }

    if (state.crashed) {
      const shakeStrength = Math.max(0, 1.2 - state.elapsedSeconds * 0.01)
      desiredPosition.addInPlace(
        new Vector3(
          Math.sin(state.elapsedSeconds * 41) * 0.16 * shakeStrength,
          Math.cos(state.elapsedSeconds * 37) * 0.1 * shakeStrength,
          0,
        ),
      )
    }

    if (immediate) {
      this.camera.position.copyFrom(desiredPosition)
    } else {
      Vector3.LerpToRef(
        this.camera.position,
        desiredPosition,
        1 - Math.exp(-6.5 * deltaSeconds),
        this.camera.position,
      )
    }
    this.camera.setTarget(target)
  }

  private updateCheckpointVisuals(): void {
    const snapshot = this.course.getSnapshot(this.simulation.state.position)
    for (const [index, checkpoint] of this.world.checkpoints.entries()) {
      checkpoint.setState(
        index < snapshot.checkpointIndex
          ? 'collected'
          : index === snapshot.checkpointIndex
            ? 'active'
            : 'pending',
      )
    }
  }

  private resetCheckpointVisuals(): void {
    this.world.checkpoints.forEach((checkpoint, index) => {
      checkpoint.setState(index === 0 ? 'active' : 'pending')
    })
  }

  private updateTelemetry(now: number): void {
    this.lastTelemetryUpdate = now
    const state = this.simulation.state
    const course = this.course.getSnapshot(state.position)
    const euler = state.rotation.toEulerAngles()
    const displayedSpeed = state.onGround
      ? Math.hypot(state.velocity.x, state.velocity.z)
      : state.airspeed
    const terrainHeight = this.world.terrainHeightAt(
      state.position.x,
      state.position.z,
    )
    const telemetry: LevelOneTelemetry = {
      airborneSeconds: course.airborneSeconds,
      altitude: Math.max(
        0,
        state.position.y - terrainHeight - GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE,
      ),
      angleOfAttack: state.angleOfAttack,
      airtimeScore: course.airtimeScore,
      backend: this.backend,
      cameraMode: this.cameraMode,
      checkpointCount: course.checkpointCount,
      checkpointDistance: course.checkpointDistance,
      checkpointIndex: course.checkpointIndex,
      coinCount: this.world.coins.length,
      coinScore: course.coinScore,
      coinsCollected: course.coinsCollected,
      damage: state.damage,
      engineRunning: state.engineRunning,
      fps: this.engine.getFps(),
      heading: state.heading,
      meshCount: this.world.scene.meshes.length,
      objective: course.objective,
      onGround: state.onGround,
      phase: course.phase,
      pitch: -euler.x * DEG_PER_RADIAN,
      pointerLocked: this.engine.isPointerLock,
      renderScale: this.currentPixelRatio / this.basePixelRatio,
      roll: -euler.z * DEG_PER_RADIAN,
      score: course.score,
      speed: Math.min(999, displayedSpeed * 3.6),
      stalled: state.stalled,
      throttle: state.throttle,
      verticalSpeed: state.verticalSpeed,
    }

    this.canvas.dataset.positionX = state.position.x.toFixed(2)
    this.canvas.dataset.positionY = state.position.y.toFixed(2)
    this.canvas.dataset.positionZ = state.position.z.toFixed(2)
    this.canvas.dataset.airborneSeconds = course.airborneSeconds.toFixed(1)
    this.canvas.dataset.coinCount = this.world.coins.length.toString()
    this.canvas.dataset.coinsCollected = course.coinsCollected.toString()
    this.canvas.dataset.score = course.score.toString()
    this.hud.update(telemetry)
    this.onTelemetry?.(telemetry)
  }

  private emitGameStatus(force = false): void {
    const snapshot = this.course.getSnapshot(this.simulation.state.position)
    const status: LevelOneGameStatus = {
      phase: snapshot.phase,
      score: snapshot.score,
    }
    const key = `${status.phase}:${status.score}`
    if (!force && key === this.lastStatusKey) {
      return
    }
    this.lastStatusKey = key
    this.onGameStatus?.(status)
  }

  private updateAdaptiveResolution(now: number): void {
    const fps = this.engine.getFps()
    const minimumPixelRatio = Math.max(0.7, this.basePixelRatio * 0.68)
    let nextPixelRatio = this.currentPixelRatio

    if (fps < this.settings.targetFps - 8) {
      nextPixelRatio = Math.max(
        minimumPixelRatio,
        this.currentPixelRatio * 0.9,
      )
    } else if (fps > this.settings.targetFps - 1.5) {
      nextPixelRatio = Math.min(
        this.basePixelRatio,
        this.currentPixelRatio * 1.04,
      )
    }

    if (Math.abs(nextPixelRatio - this.currentPixelRatio) > 0.015) {
      this.currentPixelRatio = nextPixelRatio
      this.engine.setHardwareScalingLevel(1 / nextPixelRatio)
      this.engine.resize()
    }

    this.lastAdaptiveUpdate = now
  }

  private setAircraftVisibility(visible: boolean): void {
    for (const mesh of this.world.aircraft.root.getChildMeshes(false)) {
      mesh.visibility = visible ? 1 : 0
    }
  }

  setControlInput(input: LevelOneControlInput): void {
    this.controlInput = { ...input }
  }

  startEngine(): void {
    const snapshot = this.course.getSnapshot(this.simulation.state.position)
    if (snapshot.phase !== 'ready') {
      return
    }

    void this.audio.unlock()
    this.audio.startEngine()
    this.simulation.setEngineRunning(true)
    this.course.start()
    this.emitGameStatus(true)
  }

  cycleCamera(): void {
    const phase = this.course.getSnapshot(this.simulation.state.position).phase
    if (phase === 'crashed' || phase === 'complete') {
      return
    }
    this.cameraMode = this.cameraMode === 'chase' ? 'cockpit' : 'chase'
    this.setAircraftVisibility(this.cameraMode === 'chase')
    this.updateCamera(this.simulation.state, 1 / 60, true)
  }

  completeLevel(): void {
    const event = this.course.forceComplete()
    if (!event) {
      return
    }

    if (this.paused) {
      this.setPaused(false)
    }
    if (this.simulation.state.crashed) {
      this.simulation.reset()
      this.controlInput = { ...EMPTY_LEVEL_ONE_CONTROL_INPUT }
      this.pointerPitch = 0
      this.pointerRoll = 0
      this.cameraMode = 'chase'
      this.world.clearCrashEffects()
      this.setAircraftVisibility(true)
      this.audio.reset()
      this.syncAircraftVisual(this.simulation.state, 0)
      this.updateCamera(this.simulation.state, 1 / 60, true)
      this.lastFrameTime = globalThis.performance.now()
    }

    this.handleCourseEvent(event)
  }

  resetGame(): void {
    this.simulation.reset()
    this.course.reset()
    this.controlInput = { ...EMPTY_LEVEL_ONE_CONTROL_INPUT }
    this.pointerPitch = 0
    this.pointerRoll = 0
    this.cameraMode = 'chase'
    this.world.clearCrashEffects()
    this.world.resetCoins()
    this.world.aircraft.setCrashState(false)
    this.setAircraftVisibility(true)
    this.audio.reset()
    this.resetCheckpointVisuals()
    this.syncAircraftVisual(this.simulation.state, 0)
    this.updateCamera(this.simulation.state, 1 / 60, true)
    this.lastFrameTime = globalThis.performance.now()
    this.emitGameStatus(true)
  }

  requestPointerLock(): void {
    if (this.pointerYoke && !this.paused && !this.engine.isPointerLock) {
      this.canvas.focus()
      this.engine.enterPointerlock()
    }
  }

  releasePointerLockOrPause(): void {
    if (this.engine.isPointerLock) {
      this.engine.exitPointerlock()
      return
    }
    this.setPaused(true)
  }

  togglePaused(): void {
    this.setPaused(!this.paused)
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) {
      return
    }

    this.paused = paused
    this.controlInput = { ...EMPTY_LEVEL_ONE_CONTROL_INPUT }
    this.hud.setVisible(!paused)

    if (paused) {
      this.engine.exitPointerlock()
      void this.audio.pause()
    } else {
      this.lastFrameTime = globalThis.performance.now()
      this.canvas.focus()
      void this.audio.resume()
    }

    this.onPauseChange?.(paused)
  }

  dispose(): void {
    this.engine.stopRenderLoop(this.renderFrame)
    this.resizeObserver.disconnect()
    if (this.webGpuDevice && this.webGpuErrorHandler) {
      this.webGpuDevice.removeEventListener(
        'uncapturederror',
        this.webGpuErrorHandler,
      )
    }
    this.engine.exitPointerlock()
    const cleanupSteps = [
      () => this.audio.dispose(),
      () => this.hud.dispose(),
      () => this.world.dispose(),
      () => this.world.scene.dispose(),
      () => this.engine.dispose(),
    ]
    for (const cleanup of cleanupSteps) {
      try {
        cleanup()
      } catch (error) {
        console.warn('A Level 1 cleanup step was incomplete.', error)
      }
    }
  }
}
