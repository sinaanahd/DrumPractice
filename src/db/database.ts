import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, ExerciseResult, FoundationSkill, PracticeSession, RoadmapGroup, RoadmapItem, Settings } from '../types'
import { levelFromResultState } from '../components/ExerciseLevelBadge'
import { defaultSettings, seedExercises, seedFoundationSkills, seedRoadmap, seedRoadmapGroups, seedSession } from '../data/seed'

class DrumDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  sessions!: EntityTable<PracticeSession, 'id'>
  results!: EntityTable<ExerciseResult, 'id'>
  settings!: EntityTable<Settings, 'id'>
  roadmap!: EntityTable<RoadmapItem, 'id'>
  roadmapGroups!: EntityTable<RoadmapGroup, 'id'>
  foundationSkills!: EntityTable<FoundationSkill, 'id'>

  constructor() {
    super('tempo-drum-training')
    this.version(1).stores({ exercises: 'id, category, status, custom', sessions: 'id, dayNumber, date, status', results: 'id, sessionId, exerciseId, completedAt', settings: 'id', roadmap: 'id, phase' })
    this.version(2).stores({ roadmap: 'id, groupId, order', roadmapGroups: 'id, order', foundationSkills: 'id, order, level' }).upgrade(async (transaction) => {
      const legacyRoadmap = await transaction.table('roadmap').toArray() as Array<{ id: string; name: string; phase: string; complete: boolean }>
      const nextOrder = new Map<string, number>()
      const roadmap = legacyRoadmap.map((item) => {
        const groupId = ['current', 'upcoming', 'later'].includes(item.phase) ? item.phase : 'upcoming'
        const order = nextOrder.get(groupId) ?? 0
        nextOrder.set(groupId, order + 1)
        return { id: item.id, title: item.name, groupId, order, status: item.complete ? 'comfortable' : 'planned' } satisfies RoadmapItem
      })
      await transaction.table('roadmap').clear()
      if (roadmap.length) await transaction.table('roadmap').bulkAdd(roadmap)
      await transaction.table('roadmapGroups').bulkAdd(seedRoadmapGroups)
      await transaction.table('foundationSkills').bulkAdd(seedFoundationSkills)
      await transaction.table('settings').update('settings', { currentFocus: defaultSettings.currentFocus, configurationSeedVersion: 2 })
    })
    this.version(3).stores({ sessions: 'id, dayNumber, date, status' }).upgrade(async (transaction) => {
      await transaction.table('sessions').toCollection().modify((session: PracticeSession) => {
        if (session.satisfaction === undefined) session.satisfaction = 100
      })
    })
    this.version(4).stores({ results: 'id, sessionId, exerciseId, completedAt' }).upgrade(async (transaction) => {
      await transaction.table('results').toCollection().modify((result: ExerciseResult) => {
        if (!result.performanceLevel) result.performanceLevel = levelFromResultState(result.state)
      })
    })
    this.version(5).stores({ sessions: 'id, dayNumber, date, status' }).upgrade(async (transaction) => {
      const results = await transaction.table('results').toArray() as ExerciseResult[]
      const legacyValues = new Map<string, number>()
      results.forEach((result) => {
        if (result.targetBpm != null && result.measuredBpm != null) legacyValues.set(result.sessionId, result.measuredBpm)
      })
      await transaction.table('sessions').toCollection().modify((session: PracticeSession) => {
        if (session.noMetronomeTestValue == null) {
          const value = legacyValues.get(session.id)
          if (value != null) session.noMetronomeTestValue = value
        }
      })
    })
  }
}

export const db = new DrumDatabase()

export async function initializeDatabase() {
  await db.transaction('rw', [db.exercises, db.sessions, db.results, db.settings, db.roadmap, db.roadmapGroups, db.foundationSkills], async () => {
    if (await db.exercises.count() === 0) await db.exercises.bulkAdd(seedExercises)
    if (await db.sessions.count() === 0) await db.sessions.add(seedSession())
    await db.sessions.toCollection().modify((session) => {
      if (session.satisfaction === undefined) session.satisfaction = 100
    })
    await db.results.toCollection().modify((result) => {
      if (!result.performanceLevel) result.performanceLevel = levelFromResultState(result.state)
    })
    const settings = await db.settings.get('settings')
    if (!settings) await db.settings.add(defaultSettings)
    if (!settings || (settings.configurationSeedVersion ?? 0) < 2) {
      if (await db.roadmapGroups.count() === 0) await db.roadmapGroups.bulkAdd(seedRoadmapGroups)
      if (await db.roadmap.count() === 0) await db.roadmap.bulkAdd(seedRoadmap)
      if (await db.foundationSkills.count() === 0) await db.foundationSkills.bulkAdd(seedFoundationSkills)
      if (settings) await db.settings.update('settings', { currentFocus: settings.currentFocus || defaultSettings.currentFocus, configurationSeedVersion: 2 })
    }
  })
}
