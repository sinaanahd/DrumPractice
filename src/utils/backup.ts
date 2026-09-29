import { defaultSettings, seedFoundationSkills, seedRoadmapGroups } from '../data/seed'
import { db } from '../db/database'
import type { BackupData, Exercise, ExerciseResult, PracticeSession, RoadmapItem, Settings } from '../types'

interface LegacyRoadmapItem { id: string; name: string; phase: string; complete: boolean }
export interface LegacyBackupData {
  version: 1
  exportedAt: string
  exercises: Exercise[]
  sessions: PracticeSession[]
  results: ExerciseResult[]
  settings: Partial<Settings> & { id: 'settings' }
  roadmap: LegacyRoadmapItem[]
}
export type RestorableBackup = BackupData | LegacyBackupData

const hasCoreCollections = (data: Partial<RestorableBackup>) => Array.isArray(data.exercises) && Array.isArray(data.sessions) && Array.isArray(data.results) && Array.isArray(data.roadmap) && !!data.settings && data.settings.id === 'settings' && data.sessions.every((session) => typeof session.id === 'string' && Array.isArray(session.exercises))

export function validateBackup(input: unknown): input is RestorableBackup {
  if (!input || typeof input !== 'object') return false
  const data = input as Partial<RestorableBackup>
  if ((data.version !== 1 && data.version !== 2) || !hasCoreCollections(data)) return false
  return data.version === 1 || Array.isArray((data as Partial<BackupData>).roadmapGroups) && Array.isArray((data as Partial<BackupData>).foundationSkills)
}

export function normalizeBackup(data: RestorableBackup): BackupData {
  const settings: Settings = { ...defaultSettings, ...data.settings, id: 'settings', currentFocus: data.settings.currentFocus || defaultSettings.currentFocus, configurationSeedVersion: 2 }
  if (data.version === 2) return { ...data, settings }
  const orderByGroup = new Map<string, number>()
  const roadmap: RoadmapItem[] = data.roadmap.map((item) => {
    const groupId = ['current', 'upcoming', 'later'].includes(item.phase) ? item.phase : 'upcoming'
    const order = orderByGroup.get(groupId) ?? 0
    orderByGroup.set(groupId, order + 1)
    return { id: item.id, title: item.name, groupId, order, status: item.complete ? 'comfortable' : 'planned' }
  })
  const foundationSkills = seedFoundationSkills.map((skill) => {
    const exerciseId = skill.id.replace(/^skill-/, '')
    const exercise = data.exercises.find((item) => item.id === exerciseId)
    return { ...skill, level: exercise?.status ?? skill.level, notes: exercise?.notes ?? skill.notes }
  })
  return { version: 2, exportedAt: data.exportedAt, exercises: data.exercises, sessions: data.sessions, results: data.results, settings, roadmap, roadmapGroups: seedRoadmapGroups.map((group) => ({ ...group })), foundationSkills }
}

export async function exportBackup(): Promise<BackupData> {
  const settings = await db.settings.get('settings')
  if (!settings) throw new Error('Settings not found')
  return { version: 2, exportedAt: new Date().toISOString(), exercises: await db.exercises.toArray(), sessions: await db.sessions.toArray(), results: await db.results.toArray(), settings, roadmap: await db.roadmap.toArray(), roadmapGroups: await db.roadmapGroups.toArray(), foundationSkills: await db.foundationSkills.toArray() }
}

export async function importBackup(input: RestorableBackup) {
  const data = normalizeBackup(input)
  await db.transaction('rw', [db.exercises, db.sessions, db.results, db.settings, db.roadmap, db.roadmapGroups, db.foundationSkills], async () => {
    await Promise.all([db.exercises.clear(), db.sessions.clear(), db.results.clear(), db.settings.clear(), db.roadmap.clear(), db.roadmapGroups.clear(), db.foundationSkills.clear()])
    await db.exercises.bulkAdd(data.exercises)
    await db.sessions.bulkAdd(data.sessions)
    await db.results.bulkAdd(data.results)
    await db.settings.add(data.settings)
    await db.roadmap.bulkAdd(data.roadmap)
    await db.roadmapGroups.bulkAdd(data.roadmapGroups)
    await db.foundationSkills.bulkAdd(data.foundationSkills)
  })
}
