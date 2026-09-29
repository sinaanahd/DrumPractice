import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseResult, PracticeSession } from '../types'
import { buildLegacyImportPlan, type LegacyImportData, validateLegacyImport } from './legacyImport'

const legacyData = (): LegacyImportData => ({
  format: 'drum-practice-legacy-import',
  formatVersion: 1,
  sessions: Array.from({ length: 14 }, (_, index) => ({
    id: `legacy-day-${String(index + 1).padStart(2, '0')}`,
    dayNumber: index + 1,
    date: null,
    status: index === 13 ? 'planned' : 'completed',
    plannedDurationMinutes: index === 13 ? 40 : null,
    actualDurationMinutes: index === 1 ? 60 : null,
    completionPercentage: index === 13 ? 0 : 100,
    workingBpm: index === 0 ? 60 : 65,
    summary: index === 0 ? 'First session.' : null,
    generalNotes: `Notes for day ${index + 1}`,
    plannedExercises: index === 13 ? [{ id: 'day14-warmup', order: 1, name: 'Warm-up', category: 'Warm-up', bpm: null, durationMinutes: 3, optional: false, status: 'Comfortable', instructions: ['Stay relaxed'] }] : undefined
  })),
  timingTests: [{ dayNumber: 3, targetBpm: 65, durationSeconds: 30, expectedHits: 65, observedHits: 69, deviationHits: 4 }]
})

const plannedDay14: PracticeSession = { id: 'existing-seed-day-14', dayNumber: 14, date: '2026-09-29', phase: 'Foundation', plannedDuration: 40, status: 'planned', exercises: [] }
const customSession: PracticeSession = { id: 'personal-session', dayNumber: 99, date: '2026-01-01', phase: 'Personal', plannedDuration: 20, status: 'completed', exercises: [], notes: 'Keep me' }
const emptyExisting = () => ({ sessions: [plannedDay14, customSession], exercises: [] as Exercise[], results: [] as ExerciseResult[] })
const mergeById = <T extends { id: string }>(existing: T[], next: T[]) => [...new Map([...existing, ...next].map((item) => [item.id, item])).values()]

describe('legacy history import', () => {
  it('validates the dedicated format and version', () => {
    expect(validateLegacyImport(legacyData())).toBe(true)
    expect(validateLegacyImport({ ...legacyData(), format: 'tempo-backup' })).toBe(false)
    expect(validateLegacyImport({ ...legacyData(), formatVersion: 2 })).toBe(false)
  })

  it('maps Days 1–13 to completed and Day 14 to the existing planned session', () => {
    const plan = buildLegacyImportPlan(legacyData(), emptyExisting())
    expect(plan.sessionsToPut.filter((session) => session.status === 'completed')).toHaveLength(13)
    expect(plan.sessionsToPut.find((session) => session.dayNumber === 14)).toMatchObject({ id: plannedDay14.id, status: 'planned', plannedDuration: 40 })
    expect(plan.sessionsToPut.find((session) => session.dayNumber === 1)?.date).toBe('')
  })

  it('links timing tests to their historical session without fabricating a completion grade', () => {
    const plan = buildLegacyImportPlan(legacyData(), emptyExisting())
    expect(plan.resultsToPut[0]).toMatchObject({ sessionId: 'legacy-day-03', targetBpm: 65, measuredBpm: 69, skipped: true })
    expect(plan.resultsToPut[0].note).toContain('ungraded')
  })

  it('preserves unrelated existing data and maps Day 14 exercises', () => {
    const existing = emptyExisting(); const plan = buildLegacyImportPlan(legacyData(), existing)
    expect(existing.sessions.find((session) => session.id === customSession.id)?.notes).toBe('Keep me')
    expect(plan.exercisesToPut[0]).toMatchObject({ id: 'legacy-exercise-day14-warmup', name: 'Warm-up', durationSeconds: 180 })
    expect(plan.sessionsToPut.find((session) => session.dayNumber === 14)?.exercises[0]).toMatchObject({ exerciseId: 'legacy-exercise-day14-warmup', durationSeconds: 180 })
  })

  it('is idempotent on a second import', () => {
    const source = legacyData(); const existing = emptyExisting(); const first = buildLegacyImportPlan(source, existing)
    const merged = { sessions: mergeById(existing.sessions, first.sessionsToPut), exercises: mergeById(existing.exercises, first.exercisesToPut), results: mergeById(existing.results, first.resultsToPut) }
    const second = buildLegacyImportPlan(source, merged)
    expect(second.sessionsToPut).toHaveLength(0)
    expect(second.exercisesToPut).toHaveLength(0)
    expect(second.resultsToPut).toHaveLength(0)
    expect(second.report.totals.updated).toBe(0)
    expect(second.report.totals.skipped).toBe(16)
  })
})
