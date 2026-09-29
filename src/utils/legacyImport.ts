import { db } from '../db/database'
import { seedExercises } from '../data/seed'
import type { Exercise, ExerciseCategory, ExerciseResult, PracticeSession, Settings, SkillStatus } from '../types'

interface LegacyPlannedExercise {
  id: string
  order: number
  name: string
  category: string
  bpm: number | null
  durationMinutes?: number
  durationSeconds?: number
  repetitions?: string | number
  optional: boolean
  status: string
  pattern?: string
  instructions: string[]
}

interface LegacySession {
  id: string
  dayNumber: number
  date: null
  status: 'completed' | 'planned'
  plannedDurationMinutes: number | null
  actualDurationMinutes: number | null
  completionPercentage: number
  workingBpm: number
  summary: string | null
  generalNotes: string
  plannedExercises?: LegacyPlannedExercise[]
}

interface LegacyTimingTest {
  dayNumber: number
  targetBpm: number
  durationSeconds: number
  expectedHits: number
  observedHits: number
  approxPulseBpm?: number
  deviationHits?: number
  note?: string
  attempt?: number
}

export interface LegacyImportData {
  format: 'drum-practice-legacy-import'
  formatVersion: 1
  sessions: LegacySession[]
  timingTests: LegacyTimingTest[]
  skillSnapshotAfterDay13?: Record<string, string>
  recoveryStrategies?: string[]
  profile?: { tempoZones?: { foundation?: number; working?: number; challenge?: number } }
}

export interface ImportCounts { created: number; updated: number; skipped: number }
export interface LegacyImportReport {
  sessions: ImportCounts
  exercises: ImportCounts
  timingTests: ImportCounts
  totals: ImportCounts
}

interface ExistingData {
  sessions: PracticeSession[]
  exercises: Exercise[]
  results: ExerciseResult[]
  settings?: Settings
}

export interface LegacyImportPlan {
  sessionsToPut: PracticeSession[]
  exercisesToPut: Exercise[]
  resultsToPut: ExerciseResult[]
  report: LegacyImportReport
}

const categories = new Set<ExerciseCategory>(['Warm-up', 'Timing', 'Technique', 'Subdivision', 'Coordination', 'Rudiment', 'Transitions', 'Internal Pulse', 'Challenge'])
const statuses = new Set<SkillStatus>(['New', 'Developing', 'Comfortable', 'Solid'])
const blankCounts = (): ImportCounts => ({ created: 0, updated: 0, skipped: 0 })
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)

export function validateLegacyImport(input: unknown): input is LegacyImportData {
  if (!input || typeof input !== 'object') return false
  const data = input as Partial<LegacyImportData>
  if (data.format !== 'drum-practice-legacy-import' || data.formatVersion !== 1 || !Array.isArray(data.sessions) || !Array.isArray(data.timingTests)) return false
  if (data.sessions.length !== 14 || !data.sessions.every((session) => typeof session.id === 'string' && Number.isInteger(session.dayNumber) && (session.status === 'completed' || session.status === 'planned'))) return false
  return data.timingTests.every((test) => Number.isInteger(test.dayNumber) && typeof test.targetBpm === 'number' && typeof test.observedHits === 'number' && typeof test.expectedHits === 'number')
}

const legacyNotes = (session: LegacySession, recovery: string[] = []) => {
  const details = [`Imported working BPM: ${session.workingBpm}`, `Original completion: ${session.completionPercentage}%`]
  if (session.summary) details.push(`Original summary:\n${session.summary.trim()}`)
  if (session.dayNumber === 14 && recovery.length) details.push(`Recovery strategies:\n${recovery.map((item) => `- ${item}`).join('\n')}`)
  return `${session.generalNotes.trim()}\n\n## Imported session data\n\n${details.join('\n\n')}`
}

function exerciseFromLegacy(item: LegacyPlannedExercise, snapshot: Record<string, string> = {}): Exercise {
  const category = categories.has(item.category as ExerciseCategory) ? item.category as ExerciseCategory : 'Technique'
  const status = statuses.has(item.status as SkillStatus) ? item.status as SkillStatus : 'New'
  const snapshotText = Object.entries(snapshot).find(([key]) => item.name.toLowerCase().replaceAll(/[^a-z0-9]/g, '').includes(key.toLowerCase().replaceAll(/[^a-z0-9]/g, '').replace(/60|65|70/g, '')))?.[1]
  const sourceRepetitions = typeof item.repetitions === 'string' ? `Source repetitions: ${item.repetitions}` : undefined
  return {
    id: `legacy-exercise-${item.id}`,
    name: item.name,
    category,
    description: 'Imported from the original Day 14 training plan.',
    instructions: item.instructions,
    purpose: 'Continue the structured foundation program as originally planned.',
    bpm: item.bpm ?? undefined,
    durationSeconds: item.durationSeconds ?? (item.durationMinutes ? item.durationMinutes * 60 : undefined),
    repetitions: typeof item.repetitions === 'number' ? item.repetitions : undefined,
    pattern: item.pattern,
    difficulty: category === 'Challenge' ? 'Challenge' : category === 'Subdivision' ? 'Exploratory' : 'Foundation',
    status,
    optional: item.optional,
    notes: [sourceRepetitions, snapshotText ? `Day 13 snapshot: ${snapshotText}` : undefined].filter(Boolean).join('\n') || undefined
  }
}

function timingResult(test: LegacyTimingTest, index: number, sessionId: string): ExerciseResult {
  const measuredBpm = test.approxPulseBpm ?? Number((test.targetBpm * test.observedHits / test.expectedHits).toFixed(2))
  const detail = [`Legacy timing measurement (ungraded)`, `${test.observedHits} observed / ${test.expectedHits} expected hits`, test.note, test.attempt ? `Attempt ${test.attempt}` : undefined].filter(Boolean).join(' · ')
  return {
    id: `legacy-timing-day-${String(test.dayNumber).padStart(2, '0')}-${index + 1}`,
    sessionId,
    sessionExerciseId: `legacy-timing-measurement-${String(test.dayNumber).padStart(2, '0')}-${index + 1}`,
    exerciseId: 'timing-test',
    state: 'Good',
    note: detail,
    timingNote: detail,
    targetBpm: test.targetBpm,
    measuredBpm,
    completedAt: '',
    skipped: true
  }
}

const historicalExerciseRules: Array<{ exerciseId: string; matches: RegExp }> = [
  { exerciseId: 'warm-up', matches: /warm[ -]?up|grip|rebound|right[ -]only|left[ -]only/i },
  { exerciseId: 'quarters-60', matches: /quarter(?:-note| note)s?/i },
  { exerciseId: 'eighths-leads', matches: /eighth(?:-note| note)s?|lead changes?/i },
  { exerciseId: 'quarter-eighth', matches: /quarter\s*(?:↔|to)\s*eighth|quarter-note to eighth-note|subdivision changes?/i },
  { exerciseId: 'singles-doubles', matches: /\bdoubles?\b|RRLL|singles?\s*↔\s*doubles?/i },
  { exerciseId: 'rest-return', matches: /play\s*[/→]\s*rest\s*[/→]\s*return|silent (?:bar|section)|return(?:ing)? (?:exactly )?on beat 1/i },
  { exerciseId: 'sixteenth-bursts', matches: /sixteenth/i },
  { exerciseId: 'consolidation-65', matches: /65 BPM/i },
  { exerciseId: 'timing-test', matches: /no-metronome|timing data|timing check|counter without/i },
  { exerciseId: 'challenge-70', matches: /70 BPM|challenge tempo/i },
  { exerciseId: 'foot-coordination', matches: /foot coordination/i }
]

function historicalExercises(source: LegacySession, existingExercises: Exercise[]) {
  const text = `${source.summary ?? ''}\n${source.generalNotes}`
  const library = new Map([...seedExercises, ...existingExercises].map((exercise) => [exercise.id, exercise]))
  return historicalExerciseRules
    .filter((rule) => rule.matches.test(text) && library.has(rule.exerciseId))
    .map((rule, order) => {
      const exercise = library.get(rule.exerciseId)!
      return {
        id: `legacy-session-exercise-day-${String(source.dayNumber).padStart(2, '0')}-${exercise.id}`,
        exerciseId: exercise.id,
        order,
        bpm: exercise.bpm,
        durationSeconds: exercise.durationSeconds,
        repetitions: exercise.repetitions,
        optional: exercise.optional
      }
    })
}

function countRecord<T extends { id: string }>(next: T, existing: T | undefined, counts: ImportCounts, target: T[]) {
  if (!existing) { counts.created += 1; target.push(next); return }
  if (same(next, existing)) { counts.skipped += 1; return }
  counts.updated += 1; target.push(next)
}

export function buildLegacyImportPlan(data: LegacyImportData, existing: ExistingData): LegacyImportPlan {
  const report = { sessions: blankCounts(), exercises: blankCounts(), timingTests: blankCounts(), totals: blankCounts() }
  const sessionsToPut: PracticeSession[] = []; const exercisesToPut: Exercise[] = []; const resultsToPut: ExerciseResult[] = []
  const sessionIds = new Map<number, string>()
  const day14Source = data.sessions.find((session) => session.dayNumber === 14)
  const plannedItems = day14Source?.plannedExercises ?? []

  for (const item of plannedItems) {
    const exercise = exerciseFromLegacy(item, data.skillSnapshotAfterDay13)
    countRecord(exercise, existing.exercises.find((entry) => entry.id === exercise.id), report.exercises, exercisesToPut)
  }

  for (const source of data.sessions) {
    const isDay14 = source.dayNumber === 14
    const seedDay14 = isDay14 ? existing.sessions.find((session) => session.dayNumber === 14 && session.status === 'planned') : undefined
    const id = seedDay14?.id ?? source.id
    const exercises = isDay14 ? (source.plannedExercises ?? []).map((item, index) => ({
      id: `legacy-session-exercise-${item.id}`,
      exerciseId: `legacy-exercise-${item.id}`,
      order: index,
      bpm: item.bpm ?? undefined,
      durationSeconds: item.durationSeconds ?? (item.durationMinutes ? item.durationMinutes * 60 : undefined),
      repetitions: typeof item.repetitions === 'number' ? item.repetitions : undefined,
      optional: item.optional
    })) : historicalExercises(source, existing.exercises)
    const session: PracticeSession = {
      id,
      dayNumber: source.dayNumber,
      date: '',
      phase: 'Foundation',
      plannedDuration: source.plannedDurationMinutes ?? 0,
      actualDuration: source.actualDurationMinutes ?? undefined,
      status: source.status,
      exercises,
      notes: legacyNotes(source, data.recoveryStrategies)
    }
    const current = seedDay14 ?? existing.sessions.find((entry) => entry.id === id)
    countRecord(session, current, report.sessions, sessionsToPut)
    sessionIds.set(source.dayNumber, id)
  }

  const ordinalByDay = new Map<number, number>()
  for (const test of data.timingTests) {
    const ordinal = ordinalByDay.get(test.dayNumber) ?? 0; ordinalByDay.set(test.dayNumber, ordinal + 1)
    const sessionId = sessionIds.get(test.dayNumber)
    if (!sessionId) continue
    const result = timingResult(test, ordinal, sessionId)
    countRecord(result, existing.results.find((entry) => entry.id === result.id), report.timingTests, resultsToPut)
  }

  for (const counts of [report.sessions, report.exercises, report.timingTests]) for (const key of ['created', 'updated', 'skipped'] as const) report.totals[key] += counts[key]
  return { sessionsToPut, exercisesToPut, resultsToPut, report }
}

export async function importLegacyTrainingData(data: LegacyImportData): Promise<LegacyImportReport> {
  const existing = { sessions: await db.sessions.toArray(), exercises: await db.exercises.toArray(), results: await db.results.toArray(), settings: await db.settings.get('settings') }
  const plan = buildLegacyImportPlan(data, existing)
  await db.transaction('rw', [db.sessions, db.exercises, db.results], async () => {
    if (plan.exercisesToPut.length) await db.exercises.bulkPut(plan.exercisesToPut)
    if (plan.sessionsToPut.length) await db.sessions.bulkPut(plan.sessionsToPut)
    if (plan.resultsToPut.length) await db.results.bulkPut(plan.resultsToPut)
  })
  return plan.report
}
