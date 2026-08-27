import { describe, expect, it } from 'vitest'

import { LevelOneCourse } from './level-one-course'

const checkpoints = [
  { position: { x: 10, y: 12, z: 0 }, radius: 3 },
  { position: { x: 20, y: 15, z: 0 }, radius: 3 },
]

describe('LevelOneCourse', () => {
  it('requires ordered checkpoints before a safe landing can complete the level', () => {
    const course = new LevelOneCourse(checkpoints)
    course.start()

    expect(
      course.update({
        airborne: false,
        deltaSeconds: 0,
        insideLandingZone: true,
        onGround: true,
        position: { x: 0, y: 0, z: 0 },
        speed: 0,
        verticalSpeed: 0,
      }),
    ).toBeUndefined()

    expect(
      course.update({
        airborne: true,
        deltaSeconds: 0,
        insideLandingZone: false,
        onGround: false,
        position: checkpoints[0].position,
        speed: 40,
        verticalSpeed: 0,
      })?.type,
    ).toBe('checkpoint')
    expect(
      course.update({
        airborne: true,
        deltaSeconds: 0,
        insideLandingZone: false,
        onGround: false,
        position: checkpoints[1].position,
        speed: 40,
        verticalSpeed: 0,
      })?.type,
    ).toBe('checkpoint')

    const result = course.update({
      airborne: false,
      deltaSeconds: 0,
      insideLandingZone: true,
      onGround: true,
      position: { x: 0, y: 0, z: 0 },
      speed: 12,
      verticalSpeed: -1,
    })
    expect(result?.type).toBe('complete')
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 }).phase).toBe('complete')
  })

  it('resets every recoverable state after a crash', () => {
    const course = new LevelOneCourse(checkpoints)
    course.start()
    course.update({
      airborne: true,
      deltaSeconds: 3,
      insideLandingZone: false,
      onGround: false,
      position: checkpoints[0].position,
      speed: 40,
      verticalSpeed: 0,
    })
    course.crash()

    expect(course.getSnapshot({ x: 0, y: 0, z: 0 }).phase).toBe('crashed')
    course.reset()

    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      checkpointIndex: 0,
      coinsCollected: 0,
      phase: 'ready',
      score: 0,
    })
  })

  it('force-completes with remaining checkpoint and landing points', () => {
    const course = new LevelOneCourse(checkpoints)

    expect(course.forceComplete()).toEqual({ score: 900, type: 'complete' })
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      checkpointIndex: checkpoints.length,
      phase: 'complete',
      score: 900,
    })
    expect(course.forceComplete()).toBeUndefined()
  })

  it('preserves earned points when force-completing after a crash', () => {
    const course = new LevelOneCourse(checkpoints)
    course.start()
    course.collectCoin('coin-a')
    course.update({
      airborne: true,
      deltaSeconds: 3,
      insideLandingZone: false,
      onGround: false,
      position: checkpoints[0].position,
      speed: 40,
      verticalSpeed: 0,
    })
    course.crash()
    const scoreBeforeCheat = course.getSnapshot({ x: 0, y: 0, z: 0 }).score

    const completion = course.forceComplete()
    expect(completion).toEqual({ score: scoreBeforeCheat + 750, type: 'complete' })
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      checkpointIndex: checkpoints.length,
      phase: 'complete',
      score: completion?.score,
    })
  })

  it('awards one point for each three accumulated airborne seconds', () => {
    const course = new LevelOneCourse(checkpoints)
    course.start()

    const update = (airborne: boolean, deltaSeconds: number) =>
      course.update({
        airborne,
        deltaSeconds,
        insideLandingZone: false,
        onGround: !airborne,
        position: { x: 0, y: airborne ? 20 : 0, z: 0 },
        speed: airborne ? 45 : 0,
        verticalSpeed: 0,
      })

    update(true, 2.99)
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      airborneSeconds: 2.99,
      airtimeScore: 0,
      score: 0,
    })

    update(false, 20)
    update(true, 0.01)
    for (let step = 0; step < 720; step += 1) {
      update(true, 1 / 120)
    }

    const snapshot = course.getSnapshot({ x: 0, y: 0, z: 0 })
    expect(snapshot.airborneSeconds).toBeCloseTo(9)
    expect(snapshot).toMatchObject({
      airtimeScore: 3,
      score: 3,
    })
  })

  it('collects each coin ID once and reports coin scoring stats', () => {
    const course = new LevelOneCourse(checkpoints)

    expect(course.collectCoin('coin-a')).toBeUndefined()
    course.start()

    expect(course.collectCoin('coin-a')).toEqual({
      coinId: 'coin-a',
      points: 25,
      score: 25,
      type: 'coin',
    })
    expect(course.collectCoin(' coin-a ')).toBeUndefined()
    expect(course.collectCoin('coin-b', 50)).toEqual({
      coinId: 'coin-b',
      points: 50,
      score: 75,
      type: 'coin',
    })
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      coinScore: 75,
      coinsCollected: 2,
      score: 75,
    })
  })

  it('clears collected coin IDs and all scoring counters on reset', () => {
    const course = new LevelOneCourse(checkpoints)
    course.start()
    course.collectCoin('coin-a')
    course.update({
      airborne: true,
      deltaSeconds: 3,
      insideLandingZone: false,
      onGround: false,
      position: { x: 0, y: 20, z: 0 },
      speed: 45,
      verticalSpeed: 0,
    })

    course.reset()
    expect(course.getSnapshot({ x: 0, y: 0, z: 0 })).toMatchObject({
      airborneSeconds: 0,
      airtimeScore: 0,
      coinScore: 0,
      coinsCollected: 0,
      phase: 'ready',
      score: 0,
    })

    course.start()
    expect(course.collectCoin('coin-a')?.type).toBe('coin')
  })
})
