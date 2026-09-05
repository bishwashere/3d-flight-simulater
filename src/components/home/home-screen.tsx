import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  getMenuPanelFromPath,
  HOME_PATH,
  PANEL_PATHS,
} from '../../config/menu-routes'
import { getLevelPath } from '../../config/game-levels'
import { useMenuAudio } from '../../hooks/use-menu-audio'
import { usePilotProfileStore } from '../../state'
import type { MenuPanelId } from '../../types/menu'
import { MenuPanelHost } from '../panels/menu-panel-host'
import { HeroSection } from './hero-section'
import { HomeBackdrop } from './home-backdrop'
import { HomeHeader } from './home-header'
import { MainMenu } from './main-menu'
import { PilotLoginDialog } from './pilot-login-dialog'
import { StatusRail } from './status-rail'

interface HomeScreenViewProps {
  navigate: (path: string) => void
  pathname: string
}

export function HomeScreenView({
  navigate,
  pathname,
}: HomeScreenViewProps) {
  const audio = useMenuAudio()
  const activePanel = getMenuPanelFromPath(pathname)
  const pilotRecord = usePilotProfileStore((state) => state.record)
  const [guestModeSelected, setGuestModeSelected] = useState(false)
  const [pilotLoginOpen, setPilotLoginOpen] = useState(false)
  const hasModalOpen = Boolean(activePanel) || pilotLoginOpen

  const openPanel = (panel: MenuPanelId) => {
    audio.play(panel === 'levels' ? 'confirm' : 'click')
    navigate(PANEL_PATHS[panel])
  }

  const closePanel = () => {
    audio.play('back')
    navigate(HOME_PATH)
  }

  const openPilotLogin = () => {
    audio.play('click')
    setPilotLoginOpen(true)
  }

  const closePilotLogin = () => {
    audio.play('back')
    setPilotLoginOpen(false)
  }

  const skipPilotLogin = () => {
    audio.play('back')
    setGuestModeSelected(true)
    setPilotLoginOpen(false)
  }

  const completePilotLogin = () => {
    audio.play('confirm')
    setGuestModeSelected(false)
    setPilotLoginOpen(false)
  }

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-flight-950 font-display text-flight-100 max-[47rem]:overflow-y-auto [@media(orientation:landscape)_and_(max-height:36rem)]:min-h-[36rem] [@media(orientation:landscape)_and_(max-height:36rem)]:overflow-y-auto">
      <HomeBackdrop />

      <div
        className="relative z-10 grid min-h-svh w-full grid-rows-[auto_minmax(0,1fr)_auto] px-[clamp(1.1rem,4.6vw,4.8rem)] pt-[clamp(1.1rem,3vw,2.6rem)] pb-[clamp(1rem,2.4vw,2rem)] max-[47rem]:p-4 [@media(orientation:landscape)_and_(max-height:36rem)]:min-h-[36rem] [@media(orientation:landscape)_and_(max-height:36rem)]:py-[0.8rem]"
        inert={hasModalOpen ? true : undefined}
        aria-hidden={hasModalOpen ? true : undefined}
      >
        <HomeHeader />
        <div className="mx-auto grid w-full max-w-[94rem] grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] items-center gap-[clamp(3rem,8vw,9rem)] py-[clamp(2.25rem,7vh,6.5rem)] pb-[clamp(2rem,5vh,4rem)] max-[64rem]:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)] max-[64rem]:gap-12 max-[47rem]:grid-cols-1 max-[47rem]:content-center max-[47rem]:gap-[2.2rem] max-[47rem]:pt-[clamp(2.5rem,8vh,5rem)] max-[47rem]:pb-10 [@media(orientation:landscape)_and_(max-height:36rem)]:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] [@media(orientation:landscape)_and_(max-height:36rem)]:gap-8 [@media(orientation:landscape)_and_(max-height:36rem)]:py-6">
          <HeroSection />
          <MainMenu
            guestModeSelected={guestModeSelected}
            onHover={() => audio.play('hover')}
            onPilotLogin={openPilotLogin}
            onPilotSkip={skipPilotLogin}
            onSelect={openPanel}
            pilotName={pilotRecord?.username}
          />
        </div>
        <StatusRail
          audio={audio}
          onOpenCredits={() => openPanel('credits')}
        />
      </div>

      <MenuPanelHost
        activePanel={activePanel}
        audio={audio}
        onClose={closePanel}
        onLaunchLevel={(levelId) => navigate(getLevelPath(levelId))}
      />
      <PilotLoginDialog
        onClose={closePilotLogin}
        onLoaded={completePilotLogin}
        onStayGuest={skipPilotLogin}
        open={pilotLoginOpen}
      />
    </main>
  )
}

export function HomeScreen() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <HomeScreenView
      navigate={(path) => router.push(path)}
      pathname={pathname}
    />
  )
}
