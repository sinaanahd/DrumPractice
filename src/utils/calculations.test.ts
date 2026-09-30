import { describe, expect, it } from 'vitest'
import type { ExerciseResult, PracticeSession } from '../types'
import { bpmDeviation, noMetronomeTestResult, practiceMetrics, sessionCompletion } from './calculations'

const session: PracticeSession = {
  id: 'session-1', dayNumber: 14, date: new Date().toISOString().slice(0, 10), phase: 'Foundation', plannedDuration: 40, actualDuration: 36, status: 'completed',
  exercises: [
    { id: 'required-1', exerciseId: 'a', order: 0, optional: false },
    { id: 'required-2', exerciseId: 'b', order: 1, optional: false },
    { id: 'optional-1', exerciseId: 'c', order: 2, optional: true }
  ]
}
const result = (id: string, skipped = false): ExerciseResult => ({ id, sessionId: session.id, sessionExerciseId: id, exerciseId: 'a', state: 'Good', completedAt: new Date().toISOString(), skipped })

describe('session calculations', () => {
  it('measures completion using required exercises only', () => {
    expect(sessionCompletion(session, [result('required-1'), result('optional-1')])).toBe(50)
    expect(sessionCompletion(session, [result('required-1'), result('required-2')])).toBe(100)
  })

  it('shows completed legacy sessions without exercise-level grades as complete', () => {
    expect(sessionCompletion({ ...session, notes: '## Imported session data' }, [])).toBe(100)
  })

  it('does not count skipped results as complete', () => {
    expect(sessionCompletion(session, [result('required-1', true)])).toBe(0)
  })

  it('calculates signed BPM deviation', () => {
    expect(bpmDeviation(65, 69)).toBe(4)
    expect(bpmDeviation(65, 62)).toBe(-3)
    expect(bpmDeviation(65, undefined)).toBeUndefined()
  })

  it('returns the no-metronome test value without imposing a target', () => {
    expect(noMetronomeTestResult({ ...session, noMetronomeTestValue: 69 })).toBe(69)
    expect(noMetronomeTestResult(session)).toBeUndefined()
  })

  it('uses earlier measured timing-test data when a session has no direct value yet', () => {
    expect(noMetronomeTestResult(session, [{ ...result('timing-1'), targetBpm: 65, measuredBpm: 67 }])).toBe(67)
  })

  it('summarizes practice time and sessions', () => {
    expect(practiceMetrics([session])).toEqual({ totalSessions: 1, sessionsThisWeek: 1, totalMinutes: 36, averageMinutes: 36 })
  })
})
