import type { BackupData } from '../types'
import { db } from '../db/database'

export function validateBackup(input: unknown): input is BackupData {
  if (!input || typeof input !== 'object') return false
  const data = input as Partial<BackupData>
  return data.version === 1 && Array.isArray(data.exercises) && Array.isArray(data.sessions) && Array.isArray(data.results) && Array.isArray(data.roadmap) && !!data.settings && data.settings.id === 'settings' && data.sessions.every((session) => typeof session.id === 'string' && Array.isArray(session.exercises))
}

export async function exportBackup(): Promise<BackupData> {
  const settings = await db.settings.get('settings')
  if (!settings) throw new Error('Settings not found')
  return { version: 1, exportedAt: new Date().toISOString(), exercises: await db.exercises.toArray(), sessions: await db.sessions.toArray(), results: await db.results.toArray(), settings, roadmap: await db.roadmap.toArray() }
}

export async function importBackup(data: BackupData) {
  await db.transaction('rw', [db.exercises, db.sessions, db.results, db.settings, db.roadmap], async () => {
    await Promise.all([db.exercises.clear(), db.sessions.clear(), db.results.clear(), db.settings.clear(), db.roadmap.clear()])
    await db.exercises.bulkAdd(data.exercises)
    await db.sessions.bulkAdd(data.sessions)
    await db.results.bulkAdd(data.results)
    await db.settings.add(data.settings)
    await db.roadmap.bulkAdd(data.roadmap)
  })
}
