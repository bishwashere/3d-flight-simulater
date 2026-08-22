import type { MenuAudioController } from '../../hooks/use-menu-audio'
import type { MenuPanelId } from '../../types/menu'
import { ControlsPanel } from './controls-panel'
import { CreditsPanel } from './credits-panel'
import { PreflightPanel } from './preflight-panel'
import { SettingsPanel } from './settings-panel'

interface MenuPanelHostProps {
  activePanel: MenuPanelId | null
  audio: MenuAudioController
  onClose: () => void
}

export function MenuPanelHost({
  activePanel,
  audio,
  onClose,
}: MenuPanelHostProps) {
  return (
    <>
      <PreflightPanel
        audio={audio}
        onClose={onClose}
        open={activePanel === 'preflight'}
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
