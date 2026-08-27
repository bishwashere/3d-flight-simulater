import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlayerCheckInForm } from './player-check-in-form'

describe('PlayerCheckInForm', () => {
  it('shows validation errors without submitting invalid details', () => {
    const onSubmit = vi.fn()

    render(<PlayerCheckInForm onSkip={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }))

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

  it('submits trimmed and normalized player details', () => {
    const onSubmit = vi.fn()

    render(<PlayerCheckInForm onSkip={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: '  Sky Pilot  ' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  PILOT@EXAMPLE.COM  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check in' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'pilot@example.com',
      username: 'Sky Pilot',
    })
  })

  it('can be skipped without validating or submitting', () => {
    const onSkip = vi.fn()
    const onSubmit = vi.fn()

    render(<PlayerCheckInForm onSkip={onSkip} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(onSkip).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
