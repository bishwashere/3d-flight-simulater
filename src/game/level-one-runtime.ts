import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera.js'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'

import { createLevelOneEngine } from './create-level-one-engine'
import type { LevelOneEngine } from './create-level-one-engine'
import { createLevelOneHud } from './level-one-hud'
import type { LevelOneHud } from './level-one-hud'
import { getInitialPixelRatio } from './level-one-performance'
import { createLevelOneScene } from './create-level-one-scene'
import type { LevelOneWorld } from './create-level-one-scene'
import type {
  LevelOneAssets,
  LevelOneBackend,
  LevelOneTelemetry,
  ResolvedLevelOnePerformance,
} from './level-one-types'

export interface LevelOneRuntimeOptions {
  assets: LevelOneAssets
  onPauseChange?: (paused: boolean) => void
  onTelemetry?: (telemetry: LevelOneTelemetry) => void
  performance: ResolvedLevelOnePerformance
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export class LevelOneRuntime {
  private readonly backend: LevelOneBackend
  private readonly basePixelRatio: number
  private readonly camera: FlyCamera
  private readonly canvas: HTMLCanvasElement
  private currentPixelRatio: number
  private readonly engine: LevelOneEngine
  private frameCount = 0
  private readonly hud: LevelOneHud
  private lastAdaptiveUpdate = performance.now()
  private lastSamplePosition: Vector3
  private lastTelemetryUpdate = performance.now()
  private readonly onPauseChange?: (paused: boolean) => void
  private readonly onTelemetry?: (telemetry: LevelOneTelemetry) => void
  private paused = false
  private readonly resizeObserver: ResizeObserver
  private readonly settings: ResolvedLevelOnePerformance
  private shiftBoost = false
  private smoothedSpeed = 0
  private readonly world: LevelOneWorld

  private constructor(
    canvas: HTMLCanvasElement,
    engine: LevelOneEngine,
    backend: LevelOneBackend,
    world: LevelOneWorld,
    camera: FlyCamera,
    hud: LevelOneHud,
    options: LevelOneRuntimeOptions,
    pixelRatio: number,
  ) {
    this.backend = backend
    this.basePixelRatio = pixelRatio
    this.camera = camera
    this.canvas = canvas
    this.currentPixelRatio = pixelRatio
    this.engine = engine
    this.hud = hud
    this.lastSamplePosition = camera.position.clone()
    this.onPauseChange = options.onPauseChange
    this.onTelemetry = options.onTelemetry
    this.settings = options.performance
    this.world = world
    this.resizeObserver = new ResizeObserver(() => this.engine.resize())
    this.resizeObserver.observe(canvas)

    this.attachInput()
    this.engine.runRenderLoop(this.renderFrame)
  }

  static async create(
    canvas: HTMLCanvasElement,
    options: LevelOneRuntimeOptions,
  ): Promise<LevelOneRuntime> {
    const { backend, engine } = await createLevelOneEngine(canvas)
    const pixelRatio = getInitialPixelRatio(options.performance)
    engine.setHardwareScalingLevel(1 / pixelRatio)

    try {
      const world = await createLevelOneScene(
        engine,
        options.performance,
        options.assets,
      )
      const camera = new FlyCamera(
        'first-person-flight-camera',
        world.spawnPosition.clone(),
        world.scene,
      )
      camera.setTarget(world.spawnTarget)
      camera.minZ = 0.15
      camera.maxZ = options.performance.renderDistance
      camera.fov = 1.05
      camera.inertia = 0.74
      camera.angularSensibility = 3_200
      camera.speed = 18
      camera.checkCollisions = true
      camera.applyGravity = false
      camera.ellipsoid.copyFromFloats(1.25, 1.1, 1.25)
      camera.ellipsoidOffset.copyFromFloats(0, -0.1, 0)
      camera.bankedTurn = false
      camera.keysForward = [87, 38]
      camera.keysBackward = [83, 40]
      camera.keysLeft = [65, 37]
      camera.keysRight = [68, 39]
      camera.keysUp = [32, 69]
      camera.keysDown = [17, 81]
      world.scene.activeCamera = camera
      camera.attachControl(false)

      const initialTelemetry: LevelOneTelemetry = {
        altitude: Math.max(
          0,
          camera.position.y - world.terrainHeightAt(camera.position.x, camera.position.z),
        ),
        backend,
        fps: 0,
        meshCount: world.scene.meshes.length,
        pointerLocked: false,
        renderScale: 1,
        speed: 0,
      }
      const hud = createLevelOneHud(world.scene, initialTelemetry)
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
      engine.dispose()
      throw error
    }
  }

  private attachInput(): void {
    const { scene } = this.world
    scene.onPointerObservable.add((pointerInfo) => {
      if (
        pointerInfo.type === PointerEventTypes.POINTERDOWN &&
        pointerInfo.event.button === 0 &&
        !this.paused
      ) {
        this.requestPointerLock()
      }
    })
  }

  private readonly renderFrame = (): void => {
    const now = performance.now()
    this.camera.speed = this.shiftBoost ? 65 : 18
    this.enforceWorldBounds()

    this.frameCount += 1
    if (this.frameCount % 15 === 0) {
      this.world.updateDistanceCulling(this.camera.position)
    }

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

  private enforceWorldBounds(): void {
    const position = this.camera.position
    const { bounds } = this.world
    position.x = clamp(position.x, bounds.minimumX + 2, bounds.maximumX - 2)
    position.z = clamp(position.z, bounds.minimumZ + 2, bounds.maximumZ - 2)
    const ground = Math.max(
      bounds.minimumAltitude,
      this.world.terrainHeightAt(position.x, position.z),
    )
    position.y = clamp(position.y, ground + 1.35, bounds.maximumAltitude - 2)
  }

  private updateTelemetry(now: number): void {
    const elapsedSeconds = Math.max(
      0.001,
      (now - this.lastTelemetryUpdate) / 1_000,
    )
    const travelled = Vector3.Distance(
      this.camera.position,
      this.lastSamplePosition,
    )
    const measuredSpeed = this.paused ? 0 : (travelled / elapsedSeconds) * 3.6
    this.smoothedSpeed = this.smoothedSpeed * 0.62 + measuredSpeed * 0.38
    this.lastSamplePosition.copyFrom(this.camera.position)
    this.lastTelemetryUpdate = now

    const ground = this.world.terrainHeightAt(
      this.camera.position.x,
      this.camera.position.z,
    )
    const telemetry: LevelOneTelemetry = {
      altitude: Math.max(0, this.camera.position.y - ground),
      backend: this.backend,
      fps: this.engine.getFps(),
      meshCount: this.world.scene.meshes.length,
      pointerLocked: this.engine.isPointerLock,
      renderScale: this.currentPixelRatio / this.basePixelRatio,
      speed: Math.min(999, this.smoothedSpeed),
    }
    this.canvas.dataset.positionX = this.camera.position.x.toFixed(2)
    this.canvas.dataset.positionY = this.camera.position.y.toFixed(2)
    this.canvas.dataset.positionZ = this.camera.position.z.toFixed(2)
    this.hud.update(telemetry)
    this.onTelemetry?.(telemetry)
  }

  private updateAdaptiveResolution(now: number): void {
    const fps = this.engine.getFps()
    const minimumPixelRatio = Math.max(0.5, this.basePixelRatio * 0.58)
    let nextPixelRatio = this.currentPixelRatio

    if (fps < this.settings.targetFps - 7) {
      nextPixelRatio = Math.max(
        minimumPixelRatio,
        this.currentPixelRatio * 0.88,
      )
    } else if (fps > this.settings.targetFps - 1.5) {
      nextPixelRatio = Math.min(
        this.basePixelRatio,
        this.currentPixelRatio * 1.05,
      )
    }

    if (Math.abs(nextPixelRatio - this.currentPixelRatio) > 0.015) {
      this.currentPixelRatio = nextPixelRatio
      this.engine.setHardwareScalingLevel(1 / nextPixelRatio)
      this.engine.resize()
    }

    this.lastAdaptiveUpdate = now
  }

  requestPointerLock(): void {
    if (!this.paused && !this.engine.isPointerLock) {
      this.canvas.focus()
      this.engine.enterPointerlock()
    }
  }

  resetView(): void {
    this.camera.position.copyFrom(this.world.spawnPosition)
    this.camera.cameraDirection.copyFromFloats(0, 0, 0)
    this.camera.setTarget(this.world.spawnTarget)
    this.lastSamplePosition.copyFrom(this.camera.position)
    this.smoothedSpeed = 0
  }

  releasePointerLockOrPause(): void {
    if (this.engine.isPointerLock) {
      this.engine.exitPointerlock()
      return
    }

    this.setPaused(true)
  }

  setBoost(enabled: boolean): void {
    this.shiftBoost = enabled && !this.paused
  }

  togglePaused(): void {
    this.setPaused(!this.paused)
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) {
      return
    }

    this.paused = paused
    this.shiftBoost = false
    this.hud.setVisible(!paused)

    if (paused) {
      this.camera.detachControl()
      this.engine.exitPointerlock()
    } else {
      this.camera.attachControl(false)
      this.canvas.focus()
    }

    this.onPauseChange?.(paused)
  }

  dispose(): void {
    this.engine.stopRenderLoop(this.renderFrame)
    this.resizeObserver.disconnect()
    this.camera.detachControl()
    this.hud.dispose()
    this.world.scene.dispose()
    this.engine.dispose()
  }
}
