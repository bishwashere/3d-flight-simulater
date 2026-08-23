import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'

export const AIRCRAFT_FIXED_STEP_SECONDS = 1 / 120

export type AircraftCrashReason =
  | 'collision'
  | 'ground-impact'
  | 'terrain-impact'

export interface AircraftControlInput {
  /** Positive pitches the nose up. */
  pitch?: number
  /** Positive rolls the aircraft to the right. */
  roll?: number
  /** Positive yaws the aircraft to the right. */
  yaw?: number
  /** Normalized throttle movement per second, from -1 to 1. */
  throttleDelta?: number
  /** Normalized wheel-brake pressure. `true` applies full brakes. */
  brakes?: boolean | number
}

export interface AircraftSimulationOptions {
  baseLiftCoefficient?: number
  brakeAcceleration?: number
  crashImpactSpeed?: number
  fixedStepSeconds?: number
  gearClearance?: number
  liftSlope?: number
  massKg?: number
  maxThrustNewtons?: number
  rollingResistance?: number
  spawnPosition?: Vector3
  spawnRotation?: Quaternion
  stallAngleDegrees?: number
  stallSpeed?: number
  terrainHeightAt?: (x: number, z: number) => number
  throttleRate?: number
  windAt?: (position: Readonly<Vector3>, elapsedSeconds: number) => Vector3
  wingArea?: number
}

export interface AircraftResetOptions {
  engineRunning?: boolean
  position?: Vector3
  rotation?: Quaternion
  throttle?: number
  velocity?: Vector3
}

export interface AircraftSimulationState {
  /** Body-axis angular velocity in radians/second: X pitch, Y yaw, Z roll. */
  angularVelocity: Vector3
  angleOfAttack: number
  airspeed: number
  crashReason: AircraftCrashReason | null
  crashed: boolean
  damage: number
  elapsedSeconds: number
  enginePower: number
  engineRunning: boolean
  heading: number
  onGround: boolean
  position: Vector3
  rotation: Quaternion
  stalled: boolean
  throttle: number
  velocity: Vector3
  verticalSpeed: number
}

interface ResolvedAircraftConfiguration {
  baseLiftCoefficient: number
  brakeAcceleration: number
  crashImpactSpeed: number
  fixedStepSeconds: number
  gearClearance: number
  liftSlope: number
  massKg: number
  maxThrustNewtons: number
  rollingResistance: number
  stallAngleRadians: number
  stallSpeed: number
  throttleRate: number
  wingArea: number
}

const AIR_DENSITY = 1.225
const GRAVITY = 9.80665
const MAX_FRAME_DELTA_SECONDS = 0.1
const MAX_SIMULATION_STEPS_PER_FRAME = 24
const RADIANS_TO_DEGREES = 180 / Math.PI
const WORLD_UP = Vector3.Up()

const DEFAULT_CONFIGURATION: ResolvedAircraftConfiguration = {
  baseLiftCoefficient: 0.18,
  brakeAcceleration: 12,
  crashImpactSpeed: 9,
  fixedStepSeconds: AIRCRAFT_FIXED_STEP_SECONDS,
  gearClearance: 0.82,
  liftSlope: 4.5,
  massKg: 980,
  maxThrustNewtons: 5_400,
  rollingResistance: 0.45,
  stallAngleRadians: (16 * Math.PI) / 180,
  stallSpeed: 24,
  throttleRate: 0.4,
  wingArea: 16.4,
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const clampUnit = (value: number | undefined) => clamp(value ?? 0, -1, 1)

const resolveBrakePressure = (brakes: AircraftControlInput['brakes']) => {
  if (typeof brakes === 'boolean') {
    return brakes ? 1 : 0
  }

  return clamp(brakes ?? 0, 0, 1)
}

const makeState = (): AircraftSimulationState => ({
  angularVelocity: Vector3.Zero(),
  angleOfAttack: 0,
  airspeed: 0,
  crashReason: null,
  crashed: false,
  damage: 0,
  elapsedSeconds: 0,
  enginePower: 0,
  engineRunning: false,
  heading: 0,
  onGround: true,
  position: Vector3.Zero(),
  rotation: Quaternion.Identity(),
  stalled: false,
  throttle: 0,
  velocity: Vector3.Zero(),
  verticalSpeed: 0,
})

const copyState = (
  source: Readonly<AircraftSimulationState>,
  destination: AircraftSimulationState,
) => {
  destination.position.copyFrom(source.position)
  destination.velocity.copyFrom(source.velocity)
  destination.rotation.copyFrom(source.rotation)
  destination.angularVelocity.copyFrom(source.angularVelocity)
  destination.angleOfAttack = source.angleOfAttack
  destination.airspeed = source.airspeed
  destination.crashReason = source.crashReason
  destination.crashed = source.crashed
  destination.damage = source.damage
  destination.elapsedSeconds = source.elapsedSeconds
  destination.enginePower = source.enginePower
  destination.engineRunning = source.engineRunning
  destination.heading = source.heading
  destination.onGround = source.onGround
  destination.stalled = source.stalled
  destination.throttle = source.throttle
  destination.verticalSpeed = source.verticalSpeed
}

/**
 * Deterministic, game-friendly six-degree-of-freedom aircraft simulation.
 * Babylon uses +Y as up and +Z as aircraft-forward. Call `advance` once per
 * rendered frame, or call `step` yourself at `fixedStepSeconds`.
 */
export class AircraftSimulation {
  readonly state = makeState()

  private readonly configuration: ResolvedAircraftConfiguration
  private readonly initialPosition: Vector3
  private readonly initialRotation: Quaternion
  private readonly previousState = makeState()
  private readonly terrainHeightAt: (x: number, z: number) => number
  private readonly windAt: NonNullable<AircraftSimulationOptions['windAt']>
  private accumulatorSeconds = 0
  private stalledLatch = false

  constructor(options: AircraftSimulationOptions = {}) {
    this.configuration = {
      baseLiftCoefficient:
        options.baseLiftCoefficient ?? DEFAULT_CONFIGURATION.baseLiftCoefficient,
      brakeAcceleration:
        options.brakeAcceleration ?? DEFAULT_CONFIGURATION.brakeAcceleration,
      crashImpactSpeed:
        options.crashImpactSpeed ?? DEFAULT_CONFIGURATION.crashImpactSpeed,
      fixedStepSeconds:
        options.fixedStepSeconds ?? DEFAULT_CONFIGURATION.fixedStepSeconds,
      gearClearance: options.gearClearance ?? DEFAULT_CONFIGURATION.gearClearance,
      liftSlope: options.liftSlope ?? DEFAULT_CONFIGURATION.liftSlope,
      massKg: options.massKg ?? DEFAULT_CONFIGURATION.massKg,
      maxThrustNewtons:
        options.maxThrustNewtons ?? DEFAULT_CONFIGURATION.maxThrustNewtons,
      rollingResistance:
        options.rollingResistance ?? DEFAULT_CONFIGURATION.rollingResistance,
      stallAngleRadians:
        ((options.stallAngleDegrees ?? 16) * Math.PI) / 180,
      stallSpeed: options.stallSpeed ?? DEFAULT_CONFIGURATION.stallSpeed,
      throttleRate: options.throttleRate ?? DEFAULT_CONFIGURATION.throttleRate,
      wingArea: options.wingArea ?? DEFAULT_CONFIGURATION.wingArea,
    }

    this.assertConfiguration()
    this.terrainHeightAt = options.terrainHeightAt ?? (() => 0)
    this.windAt = options.windAt ?? (() => Vector3.Zero())
    this.initialPosition = options.spawnPosition?.clone() ?? Vector3.Zero()
    this.initialRotation =
      options.spawnRotation?.clone().normalize() ?? Quaternion.Identity()
    this.reset()
  }

  get fixedStepSeconds() {
    return this.configuration.fixedStepSeconds
  }

  /**
   * Consumes a render-frame delta using a stable fixed timestep. Returns the
   * interpolation alpha for `getInterpolatedState`.
   */
  advance(elapsedSeconds: number, input: AircraftControlInput = {}) {
    const safeDelta = clamp(
      Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
      0,
      MAX_FRAME_DELTA_SECONDS,
    )
    this.accumulatorSeconds += safeDelta

    let stepCount = 0
    while (
      this.accumulatorSeconds >= this.fixedStepSeconds &&
      stepCount < MAX_SIMULATION_STEPS_PER_FRAME
    ) {
      this.step(this.fixedStepSeconds, input)
      this.accumulatorSeconds -= this.fixedStepSeconds
      stepCount += 1
    }

    if (stepCount === MAX_SIMULATION_STEPS_PER_FRAME) {
      this.accumulatorSeconds = Math.min(
        this.accumulatorSeconds,
        this.fixedStepSeconds,
      )
    }

    return clamp(this.accumulatorSeconds / this.fixedStepSeconds, 0, 1)
  }

  /** Advances one deterministic physics tick. */
  step(deltaSeconds: number, input: AircraftControlInput = {}) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return
    }

    copyState(this.state, this.previousState)
    this.state.elapsedSeconds += deltaSeconds

    if (this.state.crashed) {
      this.stepCrashed(deltaSeconds)
      this.updateDerivedState()
      return
    }

    this.updateThrottle(deltaSeconds, input)
    this.updateEnginePower(deltaSeconds)

    const inverseRotation = this.state.rotation.conjugate()
    const forward = Vector3.Forward()
    const right = Vector3.Right()
    const up = Vector3.Up()
    forward.rotateByQuaternionToRef(this.state.rotation, forward)
    right.rotateByQuaternionToRef(this.state.rotation, right)
    up.rotateByQuaternionToRef(this.state.rotation, up)

    const wind = this.windAt(this.state.position, this.state.elapsedSeconds)
    const airVelocity = this.state.velocity.subtract(wind)
    const localAirVelocity = airVelocity.clone()
    localAirVelocity.rotateByQuaternionToRef(inverseRotation, localAirVelocity)
    const airspeed = airVelocity.length()
    const forwardAirspeed = Math.max(0.1, localAirVelocity.z)
    const angleOfAttack = Math.atan2(-localAirVelocity.y, forwardAirspeed)
    const sideslip = Math.atan2(localAirVelocity.x, forwardAirspeed)

    this.updateStallState(airspeed, angleOfAttack)

    const dynamicPressure = 0.5 * AIR_DENSITY * airspeed * airspeed
    const liftCoefficient = this.calculateLiftCoefficient(angleOfAttack)
    const stallDrag = this.stalledLatch
      ? 0.22 + Math.abs(angleOfAttack) * 0.45
      : 0
    const dragCoefficient =
      0.03 + 0.062 * liftCoefficient * liftCoefficient + stallDrag
    const liftMagnitude =
      dynamicPressure * this.configuration.wingArea * liftCoefficient
    const dragMagnitude =
      dynamicPressure * this.configuration.wingArea * dragCoefficient
    const sideForceMagnitude =
      dynamicPressure * this.configuration.wingArea * clamp(-sideslip, -0.7, 0.7)

    const totalForce = new Vector3(0, -this.configuration.massKg * GRAVITY, 0)
    totalForce.addInPlace(forward.scale(this.currentThrustNewtons))
    totalForce.addInPlace(up.scale(liftMagnitude))
    totalForce.addInPlace(right.scale(sideForceMagnitude * 0.22))
    if (airspeed > 0.01) {
      totalForce.addInPlace(airVelocity.scale(-dragMagnitude / airspeed))
    }

    this.applyAngularDynamics(
      deltaSeconds,
      input,
      airspeed,
      angleOfAttack,
      sideslip,
      up,
    )

    this.state.velocity.addInPlace(
      totalForce.scale(deltaSeconds / this.configuration.massKg),
    )
    this.applyGroundForces(deltaSeconds, input, forward)
    this.state.position.addInPlace(this.state.velocity.scale(deltaSeconds))
    this.integrateRotation(deltaSeconds)
    this.resolveTerrainContact()
    this.updateDerivedState()
  }

  setEngineRunning(running: boolean) {
    if (this.state.crashed) {
      return false
    }

    this.state.engineRunning = running
    return this.state.engineRunning
  }

  toggleEngine() {
    return this.setEngineRunning(!this.state.engineRunning)
  }

  setThrottle(throttle: number) {
    this.state.throttle = clamp(Number.isFinite(throttle) ? throttle : 0, 0, 1)
  }

  adjustThrottle(normalizedDelta: number) {
    this.setThrottle(this.state.throttle + normalizedDelta)
  }

  /**
   * Reports a world collision. Minor impacts add damage; sufficiently hard
   * impacts transition deterministically into the crashed state.
   */
  registerCollision(
    impactSpeed: number,
    normal: Readonly<Vector3> = WORLD_UP,
  ) {
    if (this.state.crashed) {
      return true
    }

    const safeImpactSpeed = Math.max(0, impactSpeed)
    const damage = clamp(
      (safeImpactSpeed / this.configuration.crashImpactSpeed) * 72,
      4,
      100,
    )
    this.state.damage = clamp(this.state.damage + damage, 0, 100)

    if (
      safeImpactSpeed >= this.configuration.crashImpactSpeed ||
      this.state.damage >= 100
    ) {
      this.crash('collision', normal)
    }

    return this.state.crashed
  }

  crash(
    reason: AircraftCrashReason = 'collision',
    normal: Readonly<Vector3> = WORLD_UP,
  ) {
    if (this.state.crashed) {
      return
    }

    this.state.crashed = true
    this.state.crashReason = reason
    this.state.damage = 100
    this.state.engineRunning = false
    this.state.throttle = 0
    this.state.angularVelocity.addInPlace(
      new Vector3(normal.z * 0.8 + 0.35, normal.x * 0.5, -normal.x * 0.7 - 0.25),
    )
  }

  reset(options: AircraftResetOptions = {}) {
    const position = options.position?.clone() ?? this.initialPosition.clone()
    const groundHeight = this.getTerrainHeight(position.x, position.z)
    position.y = Math.max(position.y, groundHeight + this.configuration.gearClearance)

    this.state.position.copyFrom(position)
    this.state.velocity.copyFrom(options.velocity ?? Vector3.Zero())
    this.state.rotation.copyFrom(options.rotation ?? this.initialRotation).normalize()
    this.state.angularVelocity.setAll(0)
    this.state.angleOfAttack = 0
    this.state.airspeed = this.state.velocity.length()
    this.state.crashReason = null
    this.state.crashed = false
    this.state.damage = 0
    this.state.elapsedSeconds = 0
    this.state.engineRunning = options.engineRunning ?? false
    this.state.enginePower = this.state.engineRunning ? 0.15 : 0
    this.state.heading = this.calculateHeading()
    this.state.onGround =
      position.y <= groundHeight + this.configuration.gearClearance + 0.01
    this.state.stalled = false
    this.state.throttle = clamp(options.throttle ?? 0, 0, 1)
    this.state.verticalSpeed = this.state.velocity.y
    this.accumulatorSeconds = 0
    this.stalledLatch = false
    copyState(this.state, this.previousState)
  }

  /** Returns a detached state snapshot for render interpolation. */
  getInterpolatedState(alpha: number): AircraftSimulationState {
    const amount = clamp(alpha, 0, 1)
    const result = makeState()
    Vector3.LerpToRef(
      this.previousState.position,
      this.state.position,
      amount,
      result.position,
    )
    Vector3.LerpToRef(
      this.previousState.velocity,
      this.state.velocity,
      amount,
      result.velocity,
    )
    Vector3.LerpToRef(
      this.previousState.angularVelocity,
      this.state.angularVelocity,
      amount,
      result.angularVelocity,
    )
    Quaternion.SlerpToRef(
      this.previousState.rotation,
      this.state.rotation,
      amount,
      result.rotation,
    )
    result.angleOfAttack = this.lerpScalar(
      this.previousState.angleOfAttack,
      this.state.angleOfAttack,
      amount,
    )
    result.airspeed = this.lerpScalar(
      this.previousState.airspeed,
      this.state.airspeed,
      amount,
    )
    result.damage = this.lerpScalar(
      this.previousState.damage,
      this.state.damage,
      amount,
    )
    result.elapsedSeconds = this.lerpScalar(
      this.previousState.elapsedSeconds,
      this.state.elapsedSeconds,
      amount,
    )
    result.enginePower = this.lerpScalar(
      this.previousState.enginePower,
      this.state.enginePower,
      amount,
    )
    result.heading = this.interpolateHeading(
      this.previousState.heading,
      this.state.heading,
      amount,
    )
    result.throttle = this.lerpScalar(
      this.previousState.throttle,
      this.state.throttle,
      amount,
    )
    result.verticalSpeed = this.lerpScalar(
      this.previousState.verticalSpeed,
      this.state.verticalSpeed,
      amount,
    )
    result.crashReason = this.state.crashReason
    result.crashed = this.state.crashed
    result.engineRunning = this.state.engineRunning
    result.onGround = this.state.onGround
    result.stalled = this.state.stalled
    return result
  }

  private get currentThrustNewtons() {
    return (
      this.configuration.maxThrustNewtons *
      this.state.throttle *
      this.state.enginePower
    )
  }

  private assertConfiguration() {
    const positiveValues = [
      this.configuration.brakeAcceleration,
      this.configuration.crashImpactSpeed,
      this.configuration.fixedStepSeconds,
      this.configuration.gearClearance,
      this.configuration.massKg,
      this.configuration.maxThrustNewtons,
      this.configuration.stallAngleRadians,
      this.configuration.stallSpeed,
      this.configuration.throttleRate,
      this.configuration.wingArea,
    ]

    if (positiveValues.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error('Aircraft simulation configuration must use positive values.')
    }
  }

  private updateThrottle(deltaSeconds: number, input: AircraftControlInput) {
    const throttleMovement = clampUnit(input.throttleDelta)
    this.adjustThrottle(
      throttleMovement * this.configuration.throttleRate * deltaSeconds,
    )
  }

  private updateEnginePower(deltaSeconds: number) {
    const targetPower = this.state.engineRunning ? 1 : 0
    const spoolRate = this.state.engineRunning ? 1.35 : 2.4
    const amount = 1 - Math.exp(-spoolRate * deltaSeconds)
    this.state.enginePower += (targetPower - this.state.enginePower) * amount
    if (Math.abs(this.state.enginePower - targetPower) < 0.0001) {
      this.state.enginePower = targetPower
    }
  }

  private updateStallState(airspeed: number, angleOfAttack: number) {
    if (this.state.onGround) {
      this.stalledLatch = false
    } else if (this.stalledLatch) {
      const recoveryAngle = this.configuration.stallAngleRadians * 0.72
      this.stalledLatch = !(
        airspeed > this.configuration.stallSpeed + 4 &&
        Math.abs(angleOfAttack) < recoveryAngle
      )
    } else {
      this.stalledLatch =
        airspeed < this.configuration.stallSpeed ||
        Math.abs(angleOfAttack) > this.configuration.stallAngleRadians
    }

    this.state.stalled = this.stalledLatch
  }

  private calculateLiftCoefficient(angleOfAttack: number) {
    const linearLift =
      this.configuration.baseLiftCoefficient +
      this.configuration.liftSlope * angleOfAttack
    const absoluteAngle = Math.abs(angleOfAttack)
    if (absoluteAngle <= this.configuration.stallAngleRadians) {
      return clamp(linearLift, -1.2, 1.55)
    }

    const postStallRange = Math.max(
      0,
      absoluteAngle - this.configuration.stallAngleRadians,
    )
    const retainedLift = clamp(1 - postStallRange / 0.65, 0.18, 1)
    return clamp(linearLift, -1.65, 1.65) * retainedLift
  }

  private applyAngularDynamics(
    deltaSeconds: number,
    input: AircraftControlInput,
    airspeed: number,
    angleOfAttack: number,
    sideslip: number,
    aircraftUp: Readonly<Vector3>,
  ) {
    const pitchInput = clampUnit(input.pitch)
    const rollInput = clampUnit(input.roll)
    const yawInput = clampUnit(input.yaw)

    if (this.state.onGround) {
      const euler = this.state.rotation.toEulerAngles()
      const rotateAuthority = clamp((airspeed - 13) / 20, 0, 1)
      const desiredPitch = -pitchInput * rotateAuthority * 0.19
      this.state.angularVelocity.x +=
        ((desiredPitch - euler.x) * 10 - this.state.angularVelocity.x * 4.2) *
        deltaSeconds
      this.state.angularVelocity.z +=
        (-euler.z * 12 - this.state.angularVelocity.z * 5) * deltaSeconds

      const taxiAuthority = clamp(airspeed / 14, 0.15, 1)
      const desiredYawRate = yawInput * taxiAuthority * 0.72
      this.state.angularVelocity.y +=
        (desiredYawRate - this.state.angularVelocity.y) *
        Math.min(1, deltaSeconds * 7)
      return
    }

    const authority = clamp((airspeed / 32) ** 2, 0.08, 1.45)
    const stalledAuthority = this.stalledLatch ? 0.52 : 1
    const pitchAcceleration = -pitchInput * 1.55 * authority * stalledAuthority
    const rollAcceleration = -rollInput * 2.3 * authority * stalledAuthority
    const yawAcceleration = yawInput * 0.9 * authority * stalledAuthority
    const pitchStability = angleOfAttack * 1.65 * authority
    const yawStability = sideslip * 1.15 * authority
    const coordinatedYaw = aircraftUp.x * clamp(airspeed / 38, 0, 1) * 0.42
    const stallPitchDown = this.stalledLatch
      ? 0.55 + Math.max(0, Math.abs(angleOfAttack) - 0.18) * 1.4
      : 0

    this.state.angularVelocity.x +=
      (pitchAcceleration + pitchStability + stallPitchDown) * deltaSeconds
    this.state.angularVelocity.y +=
      (yawAcceleration + yawStability + coordinatedYaw) * deltaSeconds
    this.state.angularVelocity.z += rollAcceleration * deltaSeconds

    const pitchDamping = Math.exp(-2.15 * authority * deltaSeconds)
    const yawDamping = Math.exp(-1.75 * authority * deltaSeconds)
    const rollDamping = Math.exp(-2.35 * authority * deltaSeconds)
    this.state.angularVelocity.x *= pitchDamping
    this.state.angularVelocity.y *= yawDamping
    this.state.angularVelocity.z *= rollDamping
    this.state.angularVelocity.x = clamp(this.state.angularVelocity.x, -1.25, 1.25)
    this.state.angularVelocity.y = clamp(this.state.angularVelocity.y, -1.1, 1.1)
    this.state.angularVelocity.z = clamp(this.state.angularVelocity.z, -1.9, 1.9)
  }

  private applyGroundForces(
    deltaSeconds: number,
    input: AircraftControlInput,
    aircraftForward: Readonly<Vector3>,
  ) {
    if (!this.state.onGround) {
      return
    }

    const horizontalVelocity = new Vector3(
      this.state.velocity.x,
      0,
      this.state.velocity.z,
    )
    const groundSpeed = horizontalVelocity.length()
    if (groundSpeed < 0.001) {
      this.state.velocity.x = 0
      this.state.velocity.z = 0
      return
    }

    const brakePressure = resolveBrakePressure(input.brakes)
    const deceleration =
      this.configuration.rollingResistance +
      brakePressure * this.configuration.brakeAcceleration
    const retainedSpeed = Math.max(0, groundSpeed - deceleration * deltaSeconds)

    const levelForward = new Vector3(aircraftForward.x, 0, aircraftForward.z)
    if (levelForward.lengthSquared() > 0.0001) {
      levelForward.normalize()
      const signedForwardSpeed = Vector3.Dot(horizontalVelocity, levelForward)
      const alignedVelocity = levelForward.scale(signedForwardSpeed)
      const alignment = Math.min(1, deltaSeconds * (2.4 + brakePressure * 3))
      Vector3.LerpToRef(
        horizontalVelocity,
        alignedVelocity,
        alignment,
        horizontalVelocity,
      )
    }

    if (horizontalVelocity.lengthSquared() > 0.0001) {
      horizontalVelocity.normalize().scaleInPlace(retainedSpeed)
    }
    this.state.velocity.x = horizontalVelocity.x
    this.state.velocity.z = horizontalVelocity.z
  }

  private integrateRotation(deltaSeconds: number) {
    const rotationDelta = Quaternion.RotationYawPitchRoll(
      this.state.angularVelocity.y * deltaSeconds,
      this.state.angularVelocity.x * deltaSeconds,
      this.state.angularVelocity.z * deltaSeconds,
    )
    this.state.rotation.multiplyInPlace(rotationDelta).normalize()
  }

  private resolveTerrainContact() {
    const groundHeight = this.getTerrainHeight(
      this.state.position.x,
      this.state.position.z,
    )
    const gearHeight = groundHeight + this.configuration.gearClearance
    if (
      this.state.position.y > gearHeight + 0.001 &&
      this.state.velocity.y > 0.05
    ) {
      this.state.onGround = false
      return
    }

    if (this.state.position.y > gearHeight + 0.015) {
      this.state.onGround = false
      return
    }

    const impactSpeed = Math.max(0, -this.state.velocity.y)
    const uprightness = Vector3.Dot(this.getAircraftUp(), WORLD_UP)
    this.state.position.y = gearHeight
    if (this.state.velocity.y < 0) {
      this.state.velocity.y = 0
    }
    this.state.onGround = true
    this.stalledLatch = false
    this.state.stalled = false

    if (impactSpeed > 2.8) {
      const impactDamage = clamp((impactSpeed - 2.8) * 8, 0, 72)
      this.state.damage = clamp(this.state.damage + impactDamage, 0, 100)
    }

    if (
      impactSpeed >= this.configuration.crashImpactSpeed ||
      (uprightness < 0.48 && (impactSpeed > 1.8 || this.state.airspeed > 8))
    ) {
      this.crash('ground-impact')
    }
  }

  private stepCrashed(deltaSeconds: number) {
    this.state.enginePower +=
      (0 - this.state.enginePower) * (1 - Math.exp(-3.5 * deltaSeconds))
    this.state.velocity.y -= GRAVITY * deltaSeconds
    this.state.velocity.scaleInPlace(Math.exp(-0.24 * deltaSeconds))
    this.state.position.addInPlace(this.state.velocity.scale(deltaSeconds))
    this.state.angularVelocity.scaleInPlace(Math.exp(-0.45 * deltaSeconds))
    this.integrateRotation(deltaSeconds)

    const groundHeight = this.getTerrainHeight(
      this.state.position.x,
      this.state.position.z,
    )
    const minimumHeight = groundHeight + this.configuration.gearClearance * 0.35
    if (this.state.position.y <= minimumHeight) {
      this.state.position.y = minimumHeight
      this.state.velocity.y = 0
      const horizontalDamping = Math.exp(-4.5 * deltaSeconds)
      this.state.velocity.x *= horizontalDamping
      this.state.velocity.z *= horizontalDamping
      this.state.angularVelocity.scaleInPlace(Math.exp(-3.2 * deltaSeconds))
      this.state.onGround = true
    } else {
      this.state.onGround = false
    }
  }

  private updateDerivedState() {
    const wind = this.windAt(this.state.position, this.state.elapsedSeconds)
    const airVelocity = this.state.velocity.subtract(wind)
    const localVelocity = airVelocity.clone()
    localVelocity.rotateByQuaternionToRef(
      this.state.rotation.conjugate(),
      localVelocity,
    )
    this.state.airspeed = airVelocity.length()
    this.state.verticalSpeed = this.state.velocity.y
    this.state.angleOfAttack =
      Math.atan2(-localVelocity.y, Math.max(0.1, localVelocity.z)) *
      RADIANS_TO_DEGREES
    this.state.heading = this.calculateHeading()
  }

  private calculateHeading() {
    const forward = Vector3.Forward()
    forward.rotateByQuaternionToRef(this.state.rotation, forward)
    const heading = Math.atan2(forward.x, forward.z) * RADIANS_TO_DEGREES
    return (heading + 360) % 360
  }

  private getAircraftUp() {
    const up = Vector3.Up()
    up.rotateByQuaternionToRef(this.state.rotation, up)
    return up
  }

  private getTerrainHeight(x: number, z: number) {
    const height = this.terrainHeightAt(x, z)
    return Number.isFinite(height) ? height : 0
  }

  private lerpScalar(from: number, to: number, amount: number) {
    return from + (to - from) * amount
  }

  private interpolateHeading(from: number, to: number, amount: number) {
    const delta = ((to - from + 540) % 360) - 180
    return (from + delta * amount + 360) % 360
  }
}
