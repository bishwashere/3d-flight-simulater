import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the project scaffold', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Project scaffold ready' }),
    ).toBeInTheDocument()
  })
})
