import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PilotProfileForm } from './pilot-profile-form'

describe('PilotProfileForm', () => {
  it('shows validation errors without submitting invalid details', () => {
    const onSubmit = vi.fn()

    render(<PilotProfileForm onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save and fly' }))

    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Use at least 2 characters')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed and normalized pilot details', () => {
    const onSubmit = vi.fn()

    render(<PilotProfileForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: '  Sky Pilot  ' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  PILOT@EXAMPLE.COM  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save and fly' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'pilot@example.com',
      username: 'Sky Pilot',
    })
  })

  it('disables the fields while cloud synchronization is pending', () => {
    render(<PilotProfileForm onSubmit={vi.fn()} submitting />)

    expect(screen.getByLabelText('Username')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Syncing pilot' })).toBeDisabled()
  })
})
