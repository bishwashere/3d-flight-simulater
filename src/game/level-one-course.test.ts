import { describe, expect, it } from 'vitest'

import {
  LevelOneCourse,
  type LevelOneCourseFrame,
} from './level-one-course'

function frame(
  overrides: Partial<LevelOneCourseFrame> = {},
): LevelOneCourseFrame {
  return {
    airborne: false,
    deltaSeconds: 0,
    insideLandingZone: false,
    onGround: true,
    position: { x: 0, y: 5, z: 0 },
    regionId: 'home-island',
    speed: 0,
    verticalSpeed: 0,
    ...overrides,
  }
}

describe('unlimited flight scorekeeper', () => {
  it('does not finish until the pilot has flown, landed on a runway, and stopped', () => {
    const course = new LevelOneCourse()
    course.start()

    expect(
      course.update(frame({ insideLandingZone: true })),
    ).toBeUndefined()
    expect(course.getSnapshot().phase).toBe('playing')

    course.update(
      frame({
        airborne: true,
        deltaSeconds: 1,
        onGround: false,
        position: { x: 0, y: 40, z: 80 },
        speed: 45,
      }),
    )
    course.update(
      frame({
        insideLandingZone: true,
        position: { x: 0, y: 5, z: 120 },
        speed: 14,
        verticalSpeed: -1,
      }),
    )
    expect(course.getSnapshot()).toMatchObject({
      objective: 'HOLD B TO STOP AND BANK SCORE',
      phase: 'playing',
    })

    const result = course.update(
      frame({
        insideLandingZone: true,
        position: { x: 0, y: 5, z: 124 },
        speed: 3,
      }),
    )
    expect(result?.type).toBe('complete')
    expect(course.getSnapshot().phase).toBe('complete')
  })

  it('accumulates air time, distance, discoveries, and coins in one score', () => {
    const course = new LevelOneCourse()
    course.start()
    course.update(frame())

    course.update(
      frame({
        airborne: true,
        deltaSeconds: 3,
        onGround: false,
        position: { x: 0, y: 50, z: 250 },
        speed: 55,
      }),
    )
    const discovery = course.update(
      frame({
        airborne: true,
        deltaSeconds: 3,
        onGround: false,
        position: { x: 0, y: 55, z: 500 },
        regionId: 'region:0:1',
        speed: 55,
      }),
    )
    course.collectCoin('region:0:1:coin:1', 50)

    expect(discovery).toMatchObject({
      regionId: 'region:0:1',
      type: 'region',
    })
    expect(course.getSnapshot()).toMatchObject({
      airborneSeconds: 6,
      airtimeScore: 2,
      coinScore: 50,
      coinsCollected: 1,
      distanceScore: 50,
      distanceTravelled: 500,
      explorationScore: 100,
      regionsExplored: 2,
      score: 202,
    })
  })

  it('does not bank a flight when landing away from an airstrip', () => {
    const course = new LevelOneCourse()
    course.start()
    course.update(
      frame({ airborne: true, onGround: false, position: { x: 0, y: 30, z: 5 } }),
    )

    course.update(frame({ insideLandingZone: false, speed: 0 }))
    expect(course.getSnapshot().phase).toBe('playing')
  })

  it('collects each generated coin only once', () => {
    const course = new LevelOneCourse()
    course.start()

    expect(course.collectCoin('coin-a')).toMatchObject({ points: 25, type: 'coin' })
    expect(course.collectCoin(' coin-a ')).toBeUndefined()
    expect(course.collectCoin('coin-b', 75)).toMatchObject({
      points: 75,
      score: 100,
    })
  })

  it('resets the complete accumulated run after a crash', () => {
    const course = new LevelOneCourse()
    course.start()
    course.collectCoin('coin-a')
    course.update(
      frame({
        airborne: true,
        deltaSeconds: 3,
        onGround: false,
        position: { x: 0, y: 40, z: 150 },
      }),
    )
    course.crash()
    expect(course.getSnapshot().phase).toBe('crashed')

    course.reset()
    expect(course.getSnapshot()).toMatchObject({
      airborneSeconds: 0,
      coinsCollected: 0,
      distanceTravelled: 0,
      phase: 'ready',
      regionsExplored: 0,
      score: 0,
    })
  })
})
