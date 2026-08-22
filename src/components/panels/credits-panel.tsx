import { MenuOverlay } from '../ui/menu-overlay'

interface CreditsPanelProps {
  onClose: () => void
  open: boolean
}

const OPEN_SOURCE_CREDITS = [
  'Babylon.js',
  'Base UI',
  'Lucide',
  'Motion',
  'Google Sans Flex',
  'React',
] as const

export function CreditsPanel({ onClose, open }: CreditsPanelProps) {
  return (
    <MenuOverlay title="Credits" onClose={onClose} open={open}>
      <ul className="grid grid-cols-3 gap-3 max-[47rem]:grid-cols-2 max-[31rem]:grid-cols-1">
        {OPEN_SOURCE_CREDITS.map((credit) => (
          <li
            className="border border-flight-500/25 bg-flight-800/25 px-4 py-3 text-sm font-semibold tracking-[0.06em] text-flight-100"
            key={credit}
          >
            {credit}
          </li>
        ))}
      </ul>
    </MenuOverlay>
  )
}
