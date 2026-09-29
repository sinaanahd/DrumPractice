import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Download, FileUp, HardDrive, Moon, RotateCcw, Smartphone, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { defaultSettings, seedExercises, seedFoundationSkills, seedRoadmap, seedRoadmapGroups, seedSession } from '../data/seed'
import { db } from '../db/database'
import type { ThemePreference } from '../types'
import { exportBackup, importBackup, validateBackup } from '../utils/backup'
import { importLegacyTrainingData, type LegacyImportData, type LegacyImportReport, validateLegacyImport } from '../utils/legacyImport'

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const backupRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [reset, setReset] = useState(false)
  const [legacyPreview, setLegacyPreview] = useState<LegacyImportData>()
  const [legacyReport, setLegacyReport] = useState<LegacyImportReport>()
  if (!settings) return null

  const update = async (change: Partial<typeof settings>) => { await db.settings.update('settings', change) }
  const download = async () => {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `tempo-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); setMessage('Backup exported successfully.')
  }

  return <>
    <PageHeader eyebrow="MAKE IT YOURS" title="Settings" subtitle="Preferences and local data controls."/>
    {message && <div className="toast" onAnimationEnd={() => setMessage('')}>{message}</div>}
    <div className="settings-grid">
      <section className="settings-section"><div className="settings-title"><Moon/><div><h2>Appearance</h2><p>Choose how Tempo looks on this device.</p></div></div><div className="segmented">{(['light', 'dark', 'system'] as ThemePreference[]).map((theme) => <button className={settings.theme === theme ? 'active' : ''} key={theme} onClick={() => update({ theme })}>{theme[0].toUpperCase() + theme.slice(1)}</button>)}</div></section>
      <section className="settings-section"><div className="settings-title"><Smartphone/><div><h2>Practice defaults</h2><p>Used as a starting point for new sessions.</p></div></div><div className="settings-fields"><label><span>Default session duration</span><div><input type="number" min="10" max="120" value={settings.defaultSessionDuration} onChange={(e) => update({ defaultSessionDuration: Number(e.target.value) })}/><em>minutes</em></div></label><label><span>Metronome volume</span><input type="range" min="0" max="1" step="0.05" value={settings.metronomeVolume} onChange={(e) => update({ metronomeVolume: Number(e.target.value) })}/></label><label className="toggle-row"><span><strong>Count-in</strong><small>One bar before timed exercises</small></span><input type="checkbox" checked={settings.countIn} onChange={(e) => update({ countIn: e.target.checked })}/></label></div></section>
      <section className="settings-section settings-section--wide"><div className="settings-title"><Database/><div><h2>Your data</h2><p>Everything is stored locally in this browser. Keep a backup somewhere safe.</p></div></div><div className="data-actions data-actions--three"><button onClick={download}><Download/><span><strong>Export data</strong><small>Download a complete JSON backup</small></span></button><button onClick={() => backupRef.current?.click()}><Upload/><span><strong>Import backup</strong><small>Replace data from a Tempo backup</small></span></button><button onClick={() => historyRef.current?.click()}><FileUp/><span><strong>Import historical training data</strong><small>Merge legacy sessions without deleting data</small></span></button><input hidden ref={backupRef} type="file" accept="application/json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const json: unknown = JSON.parse(await file.text()); if (!validateBackup(json)) throw new Error(); await importBackup(json); setMessage('Backup restored successfully.') } catch { setMessage('That file is not a valid Tempo backup.') } e.target.value = '' }}/><input hidden ref={historyRef} type="file" accept="application/json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const json: unknown = JSON.parse(await file.text()); if (!validateLegacyImport(json)) throw new Error(); setLegacyPreview(json) } catch { setMessage('That file is not a valid historical training import.') } e.target.value = '' }}/></div></section>
      <section className="settings-section"><div className="settings-title"><HardDrive/><div><h2>Offline & install</h2><p>Tempo works without a connection after the first load.</p></div></div><div className="offline-info"><span><i/>Offline storage ready</span><p>Use your browser’s “Install app” or “Add to Home Screen” action to keep Tempo close.</p></div></section>
      <section className="settings-section danger-zone"><div className="settings-title"><RotateCcw/><div><h2>Start over</h2><p>Erase every session, result, and custom exercise.</p></div></div><Button variant="danger" onClick={() => setReset(true)}>Reset all data</Button></section>
    </div>
    {legacyPreview && <Modal title="Import historical training data?" onClose={() => setLegacyPreview(undefined)}><div className="legacy-preview"><p>This is a merge. Your existing sessions, results, exercises, and settings will be preserved.</p><div><span><strong>{legacyPreview.sessions.filter((session) => session.status === 'completed').length}</strong> completed sessions</span><span><strong>{legacyPreview.sessions.filter((session) => session.status === 'planned').length}</strong> planned session</span><span><strong>{legacyPreview.timingTests.length}</strong> timing measurements</span></div><p className="muted">Days without source dates remain marked “Date not recorded.” No exercise ratings will be fabricated for the historical sessions.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setLegacyPreview(undefined)}>Cancel</Button><Button onClick={async () => { const report = await importLegacyTrainingData(legacyPreview); setLegacyReport(report); setLegacyPreview(undefined) }}>Merge history</Button></div></div></Modal>}
    {legacyReport && <Modal title="Historical import complete" onClose={() => setLegacyReport(undefined)}><div className="legacy-report"><div><span><strong>{legacyReport.totals.created}</strong> created</span><span><strong>{legacyReport.totals.updated}</strong> updated</span><span><strong>{legacyReport.totals.skipped}</strong> unchanged</span></div><p>Days 1–13 are available as completed history. Day 14 is the current planned session.</p><div className="modal-actions"><Button onClick={() => setLegacyReport(undefined)}>Done</Button></div></div></Modal>}
    {reset && <Modal title="Reset all local data?" onClose={() => setReset(false)}><div className="confirm-reset"><p>This permanently removes your practice history and preferences from this browser. Export a backup first if you may want it later.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setReset(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await db.transaction('rw', [db.exercises, db.sessions, db.results, db.settings, db.roadmap, db.roadmapGroups, db.foundationSkills], async () => { await Promise.all([db.exercises.clear(), db.sessions.clear(), db.results.clear(), db.settings.clear(), db.roadmap.clear(), db.roadmapGroups.clear(), db.foundationSkills.clear()]); await db.exercises.bulkAdd(seedExercises); await db.sessions.add(seedSession()); await db.settings.add(defaultSettings); await db.roadmap.bulkAdd(seedRoadmap); await db.roadmapGroups.bulkAdd(seedRoadmapGroups); await db.foundationSkills.bulkAdd(seedFoundationSkills) }); setReset(false); setMessage('All data was reset.') }}>Yes, reset everything</Button></div></div></Modal>}
  </>
}
