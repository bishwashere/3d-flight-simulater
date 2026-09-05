import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPilotRecord } from '../../lib/pilot-profile'
import { usePilotProfileStore, useProgressionStore } from '../../state'
import { FlightRoute } from './level-route'

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}))

const savePilotRecord = vi.hoisted(() =>
  vi.fn(async <T,>(record: T): Promise<T> => record),
)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
}))

vi.mock('../../lib/pilot-api', () => ({
  isPilotStorageUnconfigured: () => false,
  savePilotRecord,
}))

vi.mock('./level-one-screen', () => ({
  LevelOneScreen: ({
    onComplete,
    onExit,
  }: {
    onComplete: (score: number) => void
    onExit: () => void
  }) => (
    <div>
      <p>Playing unlimited flight</p>
      <button onClick={() => onComplete(900)} type="button">
        Land and stop
      </button>
      <button onClick={onExit} type="button">
        Exit flight
      </button>
    </div>
  ),
}))

describe('unlimited flight route', () => {
  beforeEach(() => {
    localStorage.clear()
    navigation.push.mockReset()
    savePilotRecord.mockClear()
    useProgressionStore.getState().resetProgression()
    usePilotProfileStore.setState({
      hasHydrated: true,
      hasLoadedRemote: true,
      record: createPilotRecord({
        email: 'pilot@example.com',
        username: 'Test Pilot',
      }),
    })
  })

  it('starts a guest flight without requiring a profile first', () => {
    usePilotProfileStore.setState({ record: null })
    render(<FlightRoute />)

    expect(screen.getByText('Playing unlimited flight')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Identify pilot' }),
    ).not.toBeInTheDocument()
  })

  it('lets a guest skip saving after landing', () => {
    usePilotProfileStore.setState({ record: null })
    render(<FlightRoute />)

    fireEvent.click(screen.getByRole('button', { name: 'Land and stop' }))

    expect(
      screen.getByRole('heading', { name: 'Save this run?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Score 900')).toBeInTheDocument()
    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 0,
      completedFlights: 0,
    })
    expect(savePilotRecord).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Skip saving' }))
    expect(
      screen.queryByRole('heading', { name: 'Save this run?' }),
    ).not.toBeInTheDocument()
  })

  it('saves a guest flight when the pilot identifies after landing', async () => {
    usePilotProfileStore.setState({ record: null })
    render(<FlightRoute />)

    fireEvent.click(screen.getByRole('button', { name: 'Land and stop' }))
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'New Pilot' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))

    await waitFor(() => {
      expect(savePilotRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          bestScore: 900,
          completedFlights: 1,
          email: 'new@example.com',
          username: 'New Pilot',
        }),
      )
    })
    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 900,
      completedFlights: 1,
    })
  })

  it('records and synchronizes a returning pilot personal best', async () => {
    render(<FlightRoute />)

    fireEvent.click(screen.getByRole('button', { name: 'Land and stop' }))

    expect(useProgressionStore.getState()).toMatchObject({
      bestScore: 900,
      completedFlights: 1,
    })
    await waitFor(() => {
      expect(savePilotRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          bestScore: 900,
          completedFlights: 1,
          email: 'pilot@example.com',
        }),
      )
    })
  })

  it('returns to the main menu', () => {
    render(<FlightRoute />)
    fireEvent.click(screen.getByRole('button', { name: 'Exit flight' }))
    expect(navigation.push).toHaveBeenCalledWith('/')
  })
})
