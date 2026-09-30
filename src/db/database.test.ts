import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, initializeDatabase } from './database'
import { exportBackup, importBackup } from '../utils/backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await initializeDatabase()
})

afterAll(async () => { await db.delete() })

describe('editable training configuration persistence', () => {
  it('persists shared training context without rewriting session exercise BPMs', async () => {
    const sessionBefore = await db.sessions.toCollection().first()
    const bpmBefore = sessionBefore?.exercises.map((item) => item.bpm)
    await db.settings.update('settings', { currentFocus: 'Doubles + Recovery', foundationBpm: 58, workingBpm: 67, challengeBpm: 72 })
    db.close(); await db.open()
    expect(await db.settings.get('settings')).toMatchObject({ currentFocus: 'Doubles + Recovery', foundationBpm: 58, workingBpm: 67, challengeBpm: 72 })
    expect((await db.sessions.get(sessionBefore!.id))?.exercises.map((item) => item.bpm)).toEqual(bpmBefore)
  })

  it('persists roadmap group and item add, edit, move, reorder, and delete operations', async () => {
    await db.roadmapGroups.add({ id: 'custom-group', name: 'Songs', order: 3 })
    await db.roadmap.add({ id: 'custom-item', title: 'Practice a full song', groupId: 'custom-group', order: 0, status: 'planned' })
    await db.roadmap.update('custom-item', { title: 'Practice two songs', groupId: 'current', order: 99 })
    await db.roadmap.update('current-1', { order: 0 }); await db.roadmap.update('current-0', { order: 1 })
    expect(await db.roadmap.get('custom-item')).toMatchObject({ title: 'Practice two songs', groupId: 'current' })
    expect(await db.roadmap.get('current-1')).toMatchObject({ order: 0 })
    await db.roadmap.delete('custom-item'); await db.roadmapGroups.delete('custom-group')
    expect(await db.roadmap.get('custom-item')).toBeUndefined()
    expect(await db.roadmapGroups.get('custom-group')).toBeUndefined()
  })

  it('persists foundation skill add, edit, level, reorder, and delete operations', async () => {
    await db.foundationSkills.add({ id: 'skill-custom', name: 'Buzz rolls', level: 'New', order: 7 })
    await db.foundationSkills.update('skill-custom', { name: 'Controlled buzz rolls', level: 'Developing', order: 0 })
    expect(await db.foundationSkills.get('skill-custom')).toMatchObject({ name: 'Controlled buzz rolls', level: 'Developing', order: 0 })
    await db.foundationSkills.delete('skill-custom')
    expect(await db.foundationSkills.get('skill-custom')).toBeUndefined()
  })

  it('does not recreate deliberately deleted configuration defaults on startup', async () => {
    await db.roadmap.clear(); await db.roadmapGroups.clear(); await db.foundationSkills.clear()
    await initializeDatabase()
    expect(await db.roadmap.count()).toBe(0)
    expect(await db.roadmapGroups.count()).toBe(0)
    expect(await db.foundationSkills.count()).toBe(0)
  })

  it('round-trips all editable configuration through a version-2 backup', async () => {
    await db.settings.update('settings', { currentFocus: 'Internal Pulse' })
    await db.roadmapGroups.add({ id: 'songs', name: 'Songs', order: 3 })
    await db.foundationSkills.add({ id: 'skill-reading', name: 'Reading', level: 'New', order: 7 })
    const backup = await exportBackup()
    await db.settings.update('settings', { currentFocus: 'Changed later' })
    await db.roadmapGroups.delete('songs'); await db.foundationSkills.delete('skill-reading')
    await importBackup(backup)
    expect(await db.settings.get('settings')).toMatchObject({ currentFocus: 'Internal Pulse' })
    expect(await db.roadmapGroups.get('songs')).toMatchObject({ name: 'Songs' })
    expect(await db.foundationSkills.get('skill-reading')).toMatchObject({ name: 'Reading', level: 'New' })
  })
})
