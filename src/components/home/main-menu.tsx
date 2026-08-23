import { Gamepad2, Play, Settings2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { MenuPanelId } from '../../types/menu'
import { MenuButton } from '../ui/menu-button'

interface MainMenuProps {
  onHover: () => void
  onSelect: (panel: MenuPanelId) => void
}

const MENU_ITEMS = [
  {
    icon: Play,
    label: 'Start game',
    panel: 'levels',
    primary: true,
  },
  {
    icon: Gamepad2,
    label: 'Controls',
    panel: 'controls',
  },
  {
    icon: Settings2,
    label: 'Settings',
    panel: 'settings',
  },
] as const

export function MainMenu({ onHover, onSelect }: MainMenuProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.nav
      className="relative w-full pt-[1.1rem] pl-[1.1rem] before:absolute before:top-0 before:left-0 before:h-px before:w-[3.2rem] before:bg-hud before:shadow-hud before:content-[''] after:absolute after:top-0 after:left-0 after:h-[3.2rem] after:w-px after:bg-hud after:content-[''] max-[47rem]:max-w-[34rem] max-[47rem]:justify-self-end"
      aria-label="Main menu"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduceMotion ? 0 : 0.12,
        duration: reduceMotion ? 0 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {MENU_ITEMS.map((item, itemIndex) => (
        <MenuButton
          key={item.panel}
          {...item}
          delay={0.2 + itemIndex * 0.07}
          onActivate={() => onSelect(item.panel)}
          onHover={onHover}
        />
      ))}
    </motion.nav>
  )
}
