import { describe, expect, it } from 'vitest'
import { hashForPage, pageFromHash } from './types'

describe('reload-safe navigation', () => {
  it('round-trips every app page through the URL hash', () => {
    for (const page of ['today', 'sessions', 'progress', 'exercises', 'settings'] as const) expect(pageFromHash(hashForPage(page))).toBe(page)
  })

  it('falls back to Today for unknown routes', () => {
    expect(pageFromHash('#/unknown')).toBe('today')
  })
})
