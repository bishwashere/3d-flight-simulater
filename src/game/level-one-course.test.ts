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
        insideLandingZone: true,
        onGround: true,
        position: { x: 0, y: 0, z: 0 },
        speed: 0,
        verticalSpeed: 0,
      }),
    ).toBeUndefined()

    expect(
      course.update({
        insideLandingZone: false,
        onGround: false,
        position: checkpoints[0].position,
        speed: 40,
        verticalSpeed: 0,
      })?.type,
    ).toBe('checkpoint')
    expect(
      course.update({
        insideLandingZone: false,
        onGround: false,
        position: checkpoints[1].position,
        speed: 40,
        verticalSpeed: 0,
      })?.type,
    ).toBe('checkpoint')

    const result = course.update({
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
      phase: 'ready',
      score: 0,
    })
  })
})
