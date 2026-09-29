import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../data/seed'
import { validateBackup } from './backup'

describe('backup validation', () => {
  it('accepts a complete version 1 backup', () => {
    expect(validateBackup({ version: 1, exportedAt: new Date().toISOString(), exercises: [], sessions: [], results: [], settings: defaultSettings, roadmap: [] })).toBe(true)
  })

  it('rejects unsupported or incomplete data', () => {
    expect(validateBackup({ version: 2, exercises: [], sessions: [], results: [], settings: defaultSettings, roadmap: [] })).toBe(false)
    expect(validateBackup({ version: 1, exercises: [], sessions: 'not-an-array', results: [], settings: defaultSettings, roadmap: [] })).toBe(false)
  })
})
