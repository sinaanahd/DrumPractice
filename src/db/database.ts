import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, ExerciseResult, PracticeSession, RoadmapItem, Settings } from '../types'
import { defaultSettings, seedExercises, seedRoadmap, seedSession } from '../data/seed'

class DrumDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  sessions!: EntityTable<PracticeSession, 'id'>
  results!: EntityTable<ExerciseResult, 'id'>
  settings!: EntityTable<Settings, 'id'>
  roadmap!: EntityTable<RoadmapItem, 'id'>

  constructor() {
    super('tempo-drum-training')
    this.version(1).stores({ exercises: 'id, category, status, custom', sessions: 'id, dayNumber, date, status', results: 'id, sessionId, exerciseId, completedAt', settings: 'id', roadmap: 'id, phase' })
  }
}

export const db = new DrumDatabase()

export async function initializeDatabase() {
  const count = await db.exercises.count()
  if (count === 0) {
    await db.transaction('rw', [db.exercises, db.sessions, db.settings, db.roadmap], async () => {
      await db.exercises.bulkAdd(seedExercises)
      await db.sessions.add(seedSession())
      await db.settings.add(defaultSettings)
      await db.roadmap.bulkAdd(seedRoadmap)
    })
  }
}
