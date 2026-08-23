import type { MenuAudioController } from '../../hooks/use-menu-audio'
import type { LevelId, MenuPanelId } from '../../types/menu'
import { ControlsPanel } from './controls-panel'
import { CreditsPanel } from './credits-panel'
import { LevelSelectPanel } from './level-select-panel'
import { SettingsPanel } from './settings-panel'

interface MenuPanelHostProps {
  activePanel: MenuPanelId | null
  audio: MenuAudioController
  onClose: () => void
  onLaunchLevel: (level: LevelId) => void
}

export function MenuPanelHost({
  activePanel,
  audio,
  onClose,
  onLaunchLevel,
}: MenuPanelHostProps) {
  return (
    <>
      <LevelSelectPanel
        audio={audio}
        onClose={onClose}
        onLaunchLevel={onLaunchLevel}
        open={activePanel === 'levels'}
      />
      <ControlsPanel
        onClose={onClose}
        open={activePanel === 'controls'}
      />
      <SettingsPanel
        audio={audio}
        onClose={onClose}
        open={activePanel === 'settings'}
      />
      <CreditsPanel
        onClose={onClose}
        open={activePanel === 'credits'}
      />
    </>
  )
}
