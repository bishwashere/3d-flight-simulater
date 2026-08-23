import { Button } from '@base-ui/react/button'
import {
  Gauge,
  Headphones,
  Monitor,
  MousePointer2,
  Mountain,
  Music2,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  TreePine,
  Volume2,
  Zap,
} from 'lucide-react'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import {
  useSettingsStore,
  type PerformancePreset,
  type QualityPreset,
} from '../../state'
import { MenuOverlay } from '../ui/menu-overlay'
import { SegmentedControl } from '../ui/segmented-control'
import { SettingCopy, SettingRow } from '../ui/setting-row'
import { SettingSlider } from '../ui/setting-slider'
import { ToggleSetting } from '../ui/toggle-setting'
import { VolumeSlider } from '../ui/volume-slider'

interface SettingsPanelProps {
  audio: MenuAudioController
  onClose: () => void
  open: boolean
}

const QUALITY_OPTIONS: readonly {
  label: string
  value: PerformancePreset
}[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

export function SettingsPanel({
  audio,
  onClose,
  open,
}: SettingsPanelProps) {
  const adaptiveResolutionEnabled = useSettingsStore(
    (state) => state.adaptiveResolutionEnabled,
  )
  const musicEnabled = useSettingsStore((state) => state.musicEnabled)
  const pointerYokeEnabled = useSettingsStore(
    (state) => state.pointerYokeEnabled,
  )
  const qualityPreset = useSettingsStore((state) => state.qualityPreset)
  const renderDistance = useSettingsStore((state) => state.renderDistance)
  const renderScale = useSettingsStore((state) => state.renderScale)
  const resetSettings = useSettingsStore((state) => state.resetSettings)
  const setAdaptiveResolutionEnabled = useSettingsStore(
    (state) => state.setAdaptiveResolutionEnabled,
  )
  const setMusicEnabled = useSettingsStore((state) => state.setMusicEnabled)
  const setPointerYokeEnabled = useSettingsStore(
    (state) => state.setPointerYokeEnabled,
  )
  const setQualityPreset = useSettingsStore(
    (state) => state.setQualityPreset,
  )
  const setRenderDistance = useSettingsStore(
    (state) => state.setRenderDistance,
  )
  const setRenderScale = useSettingsStore((state) => state.setRenderScale)
  const setShadowsEnabled = useSettingsStore(
    (state) => state.setShadowsEnabled,
  )
  const setVegetationDensity = useSettingsStore(
    (state) => state.setVegetationDensity,
  )
  const shadowsEnabled = useSettingsStore((state) => state.shadowsEnabled)
  const vegetationDensity = useSettingsStore(
    (state) => state.vegetationDensity,
  )

  const chooseQuality = (quality: QualityPreset) => {
    if (quality === 'custom') {
      return
    }

    setQualityPreset(quality)
    audio.play('click')
  }

  const togglePointerYoke = (enabled: boolean) => {
    setPointerYokeEnabled(enabled)
    audio.play('click')
  }

  const restoreDefaults = () => {
    resetSettings()
    audio.play('confirm')
  }

  return (
    <MenuOverlay title="Settings" onClose={onClose} open={open}>
      <div className="grid gap-4">
        <section className="overflow-hidden border border-flight-500/25 bg-flight-800/25">
          <div className="flex items-center gap-2 border-b border-flight-500/25 bg-hud/5 px-4 py-3 text-hud">
            <Headphones aria-hidden="true" size={18} />
            <h3 className="text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              Audio
            </h3>
          </div>
          <SettingRow layout="range">
            <Volume2 aria-hidden="true" size={20} strokeWidth={1.7} />
            <SettingCopy
              label="Master volume"
              labelFor="settings-volume"
            />
            <VolumeSlider
              id="settings-volume"
              label="Master volume"
              value={audio.volume}
              onChange={audio.setVolume}
            />
          </SettingRow>
          <ToggleSetting
            checked={audio.enabled}
            icon={Headphones}
            label="Interface sounds"
            onChange={() => audio.toggle()}
          />
          <ToggleSetting
            checked={musicEnabled}
            description="Background score"
            icon={Music2}
            label="Music"
            onChange={(enabled) => {
              setMusicEnabled(enabled)
              audio.play('click')
            }}
          />
        </section>

        <section className="overflow-hidden border border-flight-500/25 bg-flight-800/25">
          <div className="flex items-center gap-2 border-b border-flight-500/25 bg-hud/5 px-4 py-3 text-hud">
            <SlidersHorizontal aria-hidden="true" size={18} />
            <h3 className="text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              Performance
            </h3>
          </div>
          <SettingRow layout="quality">
            <Gauge aria-hidden="true" size={20} strokeWidth={1.7} />
            <SettingCopy
              description={
                qualityPreset === 'custom'
                  ? 'Custom tuning active'
                  : 'Applies balanced defaults'
              }
              label="Quality preset"
            />
            <SegmentedControl
              label="Quality preset"
              options={QUALITY_OPTIONS}
              value={qualityPreset}
              onChange={chooseQuality}
            />
          </SettingRow>
          <SettingSlider
            description="World detail range"
            formatValue={(value) => `${Math.round(value)} m`}
            icon={Mountain}
            id="settings-render-distance"
            label="Render distance"
            max={3200}
            min={600}
            onChange={setRenderDistance}
            step={100}
            value={renderDistance}
          />
          <SettingSlider
            description="Internal resolution"
            formatValue={(value) => `${Math.round(value * 100)}%`}
            icon={Monitor}
            id="settings-render-scale"
            label="Render scale"
            max={1}
            min={0.5}
            onChange={setRenderScale}
            step={0.05}
            value={renderScale}
          />
          <SettingSlider
            description="Tree and grass coverage"
            formatValue={(value) => `${Math.round(value * 100)}%`}
            icon={TreePine}
            id="settings-vegetation-density"
            label="Vegetation"
            max={1}
            min={0}
            onChange={setVegetationDensity}
            step={0.05}
            value={vegetationDensity}
          />
          <ToggleSetting
            checked={shadowsEnabled}
            description="Dynamic world shadows"
            icon={Sun}
            label="Shadows"
            onChange={(enabled) => {
              setShadowsEnabled(enabled)
              audio.play('click')
            }}
          />
          <ToggleSetting
            checked={adaptiveResolutionEnabled}
            description="Protect frame rate under load"
            icon={Zap}
            label="Adaptive resolution"
            onChange={(enabled) => {
              setAdaptiveResolutionEnabled(enabled)
              audio.play('click')
            }}
          />
        </section>

        <section className="overflow-hidden border border-flight-500/25 bg-flight-800/25">
          <div className="flex items-center gap-2 border-b border-flight-500/25 bg-hud/5 px-4 py-3 text-hud">
            <MousePointer2 aria-hidden="true" size={18} />
            <h3 className="text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              Input
            </h3>
          </div>
          <ToggleSetting
            checked={pointerYokeEnabled}
            icon={MousePointer2}
            label="Mouse yoke"
            onChange={togglePointerYoke}
          />
        </section>

        <Button
          className="flex items-center gap-2 justify-self-end bg-transparent py-2 text-[0.59rem] font-semibold tracking-[0.1em] text-flight-300 uppercase transition-colors hover:text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          type="button"
          onClick={restoreDefaults}
        >
          <RotateCcw aria-hidden="true" size={16} />
          Restore defaults
        </Button>
      </div>
    </MenuOverlay>
  )
}
