import { describe, expect, it } from 'vitest'
import { defaultSettings, seedFoundationSkills, seedRoadmapGroups } from '../data/seed'
import { normalizeBackup, validateBackup } from './backup'

describe('backup validation', () => {
  it('accepts complete current and legacy backups', () => {
    const core = { exportedAt: new Date().toISOString(), exercises: [], sessions: [], results: [], settings: defaultSettings, roadmap: [] }
    expect(validateBackup({ version: 1, ...core })).toBe(true)
    expect(validateBackup({ version: 2, ...core, roadmapGroups: [], foundationSkills: [] })).toBe(true)
  })

  it('rejects unsupported or incomplete data', () => {
    expect(validateBackup({ version: 3, exercises: [], sessions: [], results: [], settings: defaultSettings, roadmap: [] })).toBe(false)
    expect(validateBackup({ version: 1, exercises: [], sessions: 'not-an-array', results: [], settings: defaultSettings, roadmap: [] })).toBe(false)
  })

  it('migrates an old backup without mutating historical sessions or exercise BPMs', () => {
    const historical = { id: 's1', dayNumber: 1, date: '', phase: 'Foundation', plannedDuration: 30, status: 'completed' as const, exercises: [{ id: 'se1', exerciseId: 'quarters-60', order: 0, bpm: 60, optional: false }] }
    const legacySettings = { ...defaultSettings } as Partial<typeof defaultSettings> & { id: 'settings' }
    delete legacySettings.currentFocus
    delete legacySettings.configurationSeedVersion
    const backup = normalizeBackup({ version: 1, exportedAt: '2026-01-01', exercises: [], sessions: [historical], results: [], settings: legacySettings, roadmap: [{ id: 'r1', name: 'Quarter notes', phase: 'current', complete: true }] })
    expect(backup.sessions[0]).toEqual(historical)
    expect(backup.sessions[0].exercises[0].bpm).toBe(60)
    expect(backup.settings.currentFocus).toBe(defaultSettings.currentFocus)
    expect(backup.roadmap[0]).toMatchObject({ title: 'Quarter notes', groupId: 'current', status: 'comfortable' })
    expect(backup.roadmapGroups).toEqual(seedRoadmapGroups)
    expect(backup.foundationSkills).toEqual(seedFoundationSkills)
  })
})
