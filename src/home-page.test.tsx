import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './app-router'
import { useProgressionStore, useSettingsStore } from './state'

function renderLauncher(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('home menu', () => {
  beforeEach(() => {
    localStorage.clear()
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
