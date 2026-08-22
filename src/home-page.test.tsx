import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './app-router'
import { useSettingsStore } from './state'

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

  it('opens and stages the free-flight flow', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: /start game/i }))

    expect(
      screen.getByRole('dialog', { name: 'Preflight staging' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stage free flight' }))

    expect(
      screen.getByRole('status', { name: 'Flight status' }),
    ).toHaveTextContent('Flight flow staged')
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

    const volume = screen.getByLabelText('Interface volume')
    fireEvent.change(volume, { target: { value: '42' } })
    expect(useSettingsStore.getState().masterVolume).toBe(0.42)

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
