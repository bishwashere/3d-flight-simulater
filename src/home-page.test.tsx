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

  it('renders one direct unlimited-flight action and pilot access', () => {
    renderLauncher()

    expect(
      screen.getByRole('heading', { name: /own the horizon/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main menu' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start unlimited flight/i }),
    ).toBeEnabled()
    expect(screen.queryByText(/select level/i)).not.toBeInTheDocument()
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

  it('loads a returning unlimited-flight pilot from the home screen', async () => {
    loadPilotRecord.mockResolvedValueOnce({
      bestScore: 1_775,
      completedFlights: 3,
      email: 'pilot@example.com',
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
      bestScore: 1_775,
      completedFlights: 3,
    })
  })

  it('launches the flight immediately without a level selector', () => {
    renderLauncher()

    fireEvent.click(
      screen.getByRole('button', { name: /start unlimited flight/i }),
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent('/game')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
