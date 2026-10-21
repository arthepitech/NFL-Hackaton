import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiagnosisPanel } from './DiagnosisPanel'

const DIAG = {
  cause: 'Set',
  reason: 'Gain à l’extérieur ; recul 0.1 yd.',
  probable: true,
  features: { 'Gain à l’extérieur': true },
  rules: { Set: '…' },
  tag: null,
}

afterEach(() => vi.unstubAllGlobals())

describe('DiagnosisPanel', () => {
  it('présente une cause probable et la confirme en 1 clic', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ proposed: 'Set', cause: 'Set', comment: '', author: 'coach', confirmed: true }),
        })
      }
      const body = url.endsWith('/tags') ? ['Switch / stunt', 'Set', 'Puissance'] : DIAG
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DiagnosisPanel gameId={1} playId={7} blockerId={10} />)
    expect(await screen.findByText('Cause probable : Placement trop lent (set)')).toBeInTheDocument()
    expect(screen.getByText(/jamais une certitude/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer « Placement trop lent (set) »' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Confirmé par coach')
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ cause: 'Set', comment: '' })
  })
})
