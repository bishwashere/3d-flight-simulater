import { describe, expect, it } from 'vitest'
import { GameAmbienceService } from './game-ambience'

describe('GameAmbienceService', () => {
  it('is safe when Web Audio is unavailable', async () => {
    const service = new GameAmbienceService()

    expect(service.isSupported).toBe(false)
    expect(await service.unlock()).toBe(false)
    expect(() => service.dispose()).not.toThrow()
    expect(() => service.dispose()).not.toThrow()
  })

  it('clamps volume and tracks its enabled state', () => {
    const service = new GameAmbienceService({ enabled: false, volume: 8 })

    expect(service.enabled).toBe(false)
    expect(service.volume).toBe(1)

    service.configure({ enabled: true, volume: -3 })

    expect(service.enabled).toBe(true)
    expect(service.volume).toBe(0)
  })
})
