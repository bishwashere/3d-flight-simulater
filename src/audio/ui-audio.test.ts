import { describe, expect, it } from 'vitest'
import { UiAudioService } from './ui-audio'

describe('UiAudioService', () => {
  it('is safe when Web Audio is unavailable', async () => {
    const service = new UiAudioService()

    expect(service.isSupported).toBe(false)
    expect(await service.unlock()).toBe(false)
    expect(() => service.play('click')).not.toThrow()
    expect(() => service.dispose()).not.toThrow()
    expect(() => service.dispose()).not.toThrow()
  })

  it('clamps its volume and applies mute state', () => {
    const service = new UiAudioService({ volume: 4 })

    expect(service.volume).toBe(1)

    service.setVolume(-2)
    service.setMuted(true)

    expect(service.volume).toBe(0)
    expect(service.isMuted).toBe(true)
  })
})
