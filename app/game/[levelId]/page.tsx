import { redirect } from 'next/navigation'

/** Redirects bookmarks from the former level routes into unlimited flight. */
export default function LegacyGamePage() {
  redirect('/game')
}
