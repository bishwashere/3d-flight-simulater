import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeScreenView } from './components/home/home-screen'
import type { PilotRecord } from './lib/pilot-profile'
import {
  usePilotProfileStore,
  useProgressionStore,
  useSettingsStore,
} from './state'

const loadPilotRecord = vi.hoisted(() =>
  vi.fn(async (): Promise<PilotRecord | null> => null),
)

vi.mock('./lib/pilot-api', () => ({
  isPilotStorageUnconfigured: () => false,
  loadPilotRecord,
}))

function renderLauncher(initialPath = '/') {
  function Launcher() {
    const [pathname, setPathname] = useState(initialPath)
    return (
      <>
        <HomeScreenView navigate={setPathname} pathname={pathname} />
        <output data-testid="current-path">{pathname}</output>
      </>
    )
  }

  return render(<Launcher />)
}

describe('home menu', () => {
  beforeEach(() => {
    localStorage.clear()
    loadPilotRecord.mockClear()
    usePilotProfileStore.setState({
      hasHydrated: true,
      hasLoadedRemote: true,
      record: null,
    })
    useProgressionStore.getState().resetProgression()
    useSettingsStore.getState().resetSettings()
  })

  it('renders the game launcher and its primary actions', () => {
    renderLauncher()

    expect(
      screen.getByRole('heading', { name: /own the horizon/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main menu' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start game/i }),
    ).toBeEnabled()
    expect(screen.getByText('Returning pilot?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled()
  })

  it('keeps the player as a guest after skipping pilot login', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(screen.getByText('Guest mode')).toBeInTheDocument()
    expect(screen.queryByText('Returning pilot?')).not.toBeInTheDocument()
    expect(usePilotProfileStore.getState().record).toBeNull()
  })

  it('loads a returning pilot from the home screen', async () => {
    loadPilotRecord.mockResolvedValueOnce({
      email: 'pilot@example.com',
      levels: [{ id: 1, passed: true, score: 1775 }],
      username: 'Sky Pilot',
    })
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' PILOT@example.com ' },
    })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Pilot login' })).getByRole(
        'button',
        { name: /log in/i },
      ),
    )

    expect(await screen.findByText('Pilot loaded')).toBeInTheDocument()
    expect(screen.getByText('Sky Pilot')).toBeInTheDocument()
    expect(usePilotProfileStore.getState().record).toMatchObject({
      email: 'pilot@example.com',
      username: 'Sky Pilot',
    })
    expect(useProgressionStore.getState()).toMatchObject({
      bestScores: { 'level-1': 1775 },
      completedLevelIds: ['level-1'],
      unlockedLevelIds: ['level-1', 'level-2'],
    })
  })

  it('opens level selection with only level one unlocked', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: /start game/i }))

    expect(
      screen.getByRole('dialog', { name: 'Select level' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /level 1: first flight/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /locked level 2: island bend/i }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /locked level 3: coastal circuit/i }),
    ).toBeDisabled()
  })

  it('navigates to the selected level through its real URL', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: /start game/i }))
    fireEvent.click(
      screen.getByRole('button', { name: /level 1: first flight/i }),
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/game/level-1',
    )
  })

  it('shows completion, best score, and the newly unlocked level', () => {
    useProgressionStore.getState().completeLevel('level-1', 1450)
    renderLauncher('/play')

    const levelOne = screen.getByRole('button', {
      name: /level 1: first flight/i,
    })
    const levelTwo = screen.getByRole('button', {
      name: /level 2: island bend/i,
    })

    expect(within(levelOne).getByText('Complete')).toBeInTheDocument()
    expect(within(levelOne).getByText('Best 1450')).toBeInTheDocument()
    expect(levelTwo).toBeEnabled()
  })

  it('updates sound settings and closes panels with Escape', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: /settings/i }))

    const soundToggle = screen.getByRole('switch', {
      name: 'Interface sounds',
    })
    expect(soundToggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(soundToggle)
    expect(soundToggle).toHaveAttribute('aria-checked', 'false')
    expect(useSettingsStore.getState().uiSoundsEnabled).toBe(false)

    const settingsDialog = screen.getByRole('dialog', { name: 'Settings' })
    const volume = within(settingsDialog).getByLabelText('Master volume')
    fireEvent.change(volume, { target: { value: '42' } })
    expect(useSettingsStore.getState().masterVolume).toBe(0.42)

    const musicToggle = screen.getByRole('switch', { name: 'Music' })
    fireEvent.click(musicToggle)
    expect(useSettingsStore.getState().musicEnabled).toBe(false)

    fireEvent.click(screen.getByRole('switch', { name: 'Shadows' }))
    expect(useSettingsStore.getState()).toMatchObject({
      qualityPreset: 'custom',
      shadowsEnabled: false,
    })

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('supports direct URLs for menu panels', () => {
    renderLauncher('/controls')

    expect(
      screen.getByRole('dialog', { name: 'Flight controls' }),
    ).toBeInTheDocument()
  })
})
