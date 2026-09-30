import type { ExerciseResult, PracticeSession } from '../types'

export function noMetronomeTestResult(session: PracticeSession, results: ExerciseResult[] = []) {
  if (session.noMetronomeTestValue != null) return session.noMetronomeTestValue
  return results.filter((result) => result.sessionId === session.id && result.targetBpm != null && result.measuredBpm != null).at(-1)?.measuredBpm
}

export const bpmDeviation = (target?: number, measured?: number) => target == null || measured == null ? undefined : measured - target

export function sessionCompletion(session: PracticeSession, results: ExerciseResult[]): number {
  const completedResults = results.filter((result) => result.sessionId === session.id && !result.skipped)
  if (session.status === 'completed' && completedResults.length === 0 && session.notes?.includes('## Imported session data')) return 100
  const required = session.exercises.filter((exercise) => !exercise.optional)
  if (!required.length) return session.status === 'completed' ? 100 : 0
  const doneIds = new Set(completedResults.map((result) => result.sessionExerciseId))
  return Math.round((required.filter((exercise) => doneIds.has(exercise.id)).length / required.length) * 100)
}

export function practiceMetrics(sessions: PracticeSession[]) {
  const completed = sessions.filter((session) => session.status === 'completed' || session.status === 'partial')
  const totalMinutes = completed.reduce((sum, session) => sum + (session.actualDuration ?? 0), 0)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  return {
    totalSessions: completed.length,
    sessionsThisWeek: completed.filter((session) => new Date(session.date) >= weekAgo).length,
    totalMinutes,
    averageMinutes: completed.length ? Math.round(totalMinutes / completed.length) : 0
  }
}

export const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
export const formatDate = (date: string) => date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Date not recorded'
