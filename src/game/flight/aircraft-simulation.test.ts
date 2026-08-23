import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { describe, expect, it } from 'vitest'
import {
  AIRCRAFT_FIXED_STEP_SECONDS,
  AircraftSimulation,
  type AircraftControlInput,
} from './aircraft-simulation'

const runFor = (
  simulation: AircraftSimulation,
  seconds: number,
  controls: AircraftControlInput | ((elapsed: number) => AircraftControlInput),
) => {
  const stepCount = Math.round(seconds / AIRCRAFT_FIXED_STEP_SECONDS)
  for (let step = 0; step < stepCount; step += 1) {
    const elapsed = step * AIRCRAFT_FIXED_STEP_SECONDS
    simulation.step(
      AIRCRAFT_FIXED_STEP_SECONDS,
      typeof controls === 'function' ? controls(elapsed) : controls,
    )
  }
}

describe('AircraftSimulation', () => {
  it('begins parked with the engine stopped', () => {
    const simulation = new AircraftSimulation({
      terrainHeightAt: () => 4,
    })

    expect(simulation.state.position.y).toBeCloseTo(4.82)
    expect(simulation.state.onGround).toBe(true)
    expect(simulation.state.engineRunning).toBe(false)
    expect(simulation.state.airspeed).toBe(0)
  })

  it('starts, taxis, rotates, and takes off under aerodynamic lift', () => {
    const simulation = new AircraftSimulation()
    simulation.setEngineRunning(true)
    simulation.setThrottle(1)

    runFor(simulation, 13, (elapsed) => ({
      pitch: elapsed > 6 ? 1 : 0,
    }))

    expect(simulation.state.engineRunning).toBe(true)
    expect(simulation.state.airspeed).toBeGreaterThan(20)
    expect(simulation.state.position.y).toBeGreaterThan(8)
    expect(simulation.state.onGround).toBe(false)
    expect(simulation.state.crashed).toBe(false)
  })

  it('applies wheel brakes while taxiing', () => {
    const simulation = new AircraftSimulation()
    simulation.setEngineRunning(true)
    simulation.setThrottle(0.65)
    runFor(simulation, 5, {})
    const taxiSpeed = simulation.state.airspeed

    simulation.setThrottle(0)
    runFor(simulation, 2, { brakes: true })

    expect(taxiSpeed).toBeGreaterThan(8)
    expect(simulation.state.airspeed).toBeLessThan(0.5)
  })

  it('enters a stall at low airborne speed and recovers with speed', () => {
    const simulation = new AircraftSimulation({
      spawnPosition: new Vector3(0, 120, 0),
    })

    simulation.step(AIRCRAFT_FIXED_STEP_SECONDS)
    expect(simulation.state.stalled).toBe(true)

    simulation.reset({
      position: new Vector3(0, 120, 0),
      velocity: new Vector3(0, 0, 40),
    })
    simulation.step(AIRCRAFT_FIXED_STEP_SECONDS)

    expect(simulation.state.stalled).toBe(false)
  })

  it('transitions hard collisions into a recoverable crashed state', () => {
    const simulation = new AircraftSimulation()
    simulation.setEngineRunning(true)

    expect(simulation.registerCollision(14, Vector3.Left())).toBe(true)
    expect(simulation.state.crashed).toBe(true)
    expect(simulation.state.damage).toBe(100)
    expect(simulation.state.engineRunning).toBe(false)
    expect(simulation.state.crashReason).toBe('collision')

    simulation.reset()
    expect(simulation.state.crashed).toBe(false)
    expect(simulation.state.damage).toBe(0)
    expect(simulation.state.onGround).toBe(true)
  })

  it('produces deterministic fixed-step results', () => {
    const options = {
      spawnPosition: new Vector3(3, 20, -8),
      spawnRotation: Quaternion.RotationYawPitchRoll(0.2, -0.05, 0),
      windAt: () => new Vector3(1.5, 0, -0.5),
    }
    const first = new AircraftSimulation(options)
    const second = new AircraftSimulation(options)
    first.setEngineRunning(true)
    second.setEngineRunning(true)
    first.setThrottle(0.8)
    second.setThrottle(0.8)

    const controls = (elapsed: number): AircraftControlInput => ({
      pitch: Math.sin(elapsed * 0.7) * 0.25,
      roll: Math.cos(elapsed * 0.4) * 0.35,
      yaw: 0.1,
    })
    runFor(first, 3, controls)
    runFor(second, 3, controls)

    expect(first.state.position.asArray()).toEqual(second.state.position.asArray())
    expect(first.state.velocity.asArray()).toEqual(second.state.velocity.asArray())
    expect(first.state.rotation.asArray()).toEqual(second.state.rotation.asArray())
  })
})
