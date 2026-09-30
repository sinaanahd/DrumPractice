import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, Copy, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { SatisfactionArc } from '../components/SatisfactionArc'
import { ExerciseLevelBadge } from '../components/ExerciseLevelBadge'
import { db } from '../db/database'
import { SessionComposer } from '../features/sessions/SessionComposer'
import { activeSessionStore } from '../store/activeSession'
import type { PracticeSession } from '../types'
import { formatDate, sessionCompletion } from '../utils/calculations'

type Filter = 'All' | 'Completed' | 'Partial' | 'Difficult'

export function SessionsPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('dayNumber').reverse().toArray(), []) ?? []
  const results = useLiveQuery(() => db.results.toArray(), []) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const [filter, setFilter] = useState<Filter>('All')
  const [selected, setSelected] = useState<PracticeSession>()
  const [editing, setEditing] = useState<PracticeSession | 'new'>()
  const [deleting, setDeleting] = useState<PracticeSession>()
  const nextDayNumber = Math.max(0, ...sessions.map((session) => session.dayNumber)) + 1

  const filtered = sessions.filter((session) => filter === 'All'
    || filter === 'Completed' && session.status === 'completed'
    || filter === 'Partial' && session.status === 'partial'
    || filter === 'Difficult' && results.some((result) => result.sessionId === session.id && (result.state === 'Difficult' || result.state === 'Failed / retry later')))

  const duplicateSession = async (source: PracticeSession) => {
    const copy: PracticeSession = {
      ...source,
      id: crypto.randomUUID(),
      dayNumber: nextDayNumber,
      date: new Date().toISOString().slice(0, 10),
      status: 'planned',
      actualDuration: undefined,
      energy: undefined,
      satisfaction: 100,
      startedAt: undefined,
      completedAt: undefined,
      exercises: source.exercises.map((item) => ({ ...item, id: crypto.randomUUID() }))
    }
    await db.sessions.add(copy)
  }

  const removeSession = async (session: PracticeSession) => {
    await db.transaction('rw', [db.sessions, db.results], async () => {
      await db.results.where('sessionId').equals(session.id).delete()
      await db.sessions.delete(session.id)
    })
    if (activeSessionStore.getSnapshot().sessionId === session.id) activeSessionStore.reset()
    setSelected(undefined)
    setDeleting(undefined)
  }

  const durationLabel = (session: PracticeSession) => session.actualDuration
    ? `${session.actualDuration} min`
    : session.status === 'completed' ? 'Not recorded' : 'Planned'

  return <>
    <PageHeader eyebrow="PRACTICE LOG" title="Sessions" subtitle="Build sessions from your exercise library and keep a useful practice history." action={<Button icon={<Plus/>} onClick={() => setEditing('new')}>New session</Button>}/>
    <div className="filter-tabs">{(['All', 'Completed', 'Partial', 'Difficult'] as Filter[]).map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
    {filtered.length ? <div className="session-list">{filtered.map((session) => {
      const sessionResults = results.filter((result) => result.sessionId === session.id)
      const completion = sessionCompletion(session, results)
      const workingBpm = sessionResults.map((result) => result.bpmUsed ?? 0).sort((a, b) => b - a)[0]
      const difficult = sessionResults.filter((result) => result.state === 'Difficult' || result.state === 'Failed / retry later').length
      return <article className="session-card" key={session.id}>
        <div className="session-day"><span>{String(session.dayNumber).padStart(2, '0')}</span><small>DAY</small></div>
        <button className="session-primary session-card__open" onClick={() => setSelected(session)}><strong>{formatDate(session.date)}</strong><span>{session.phase} phase · {session.exercises.length} exercises</span></button>
        <div className="session-data"><span><small>DURATION</small><strong>{durationLabel(session)}</strong></span><span><small>COMPLETION</small><strong>{completion}%</strong></span><span><small>WORKING BPM</small><strong>{workingBpm || '—'}</strong></span></div>
        <div className="session-result"><SatisfactionArc value={session.satisfaction} compact/><div><span className={`session-state session-state--${session.status}`}>{session.status}</span>{difficult > 0 && <small>{difficult} difficult</small>}{session.notes && <FileText size={15}/>}</div></div>
        <div className="session-card__actions"><button aria-label={`Edit Day ${session.dayNumber}`} title="Edit session" onClick={() => setEditing(session)}><Pencil/></button><button className="danger" aria-label={`Delete Day ${session.dayNumber}`} title="Delete session" onClick={() => setDeleting(session)}><Trash2/></button><button aria-label={`View Day ${session.dayNumber}`} title="View session" onClick={() => setSelected(session)}><ChevronRight/></button></div>
      </article>
    })}</div> : <EmptyState icon={<CalendarDays/>} title="No sessions here yet" message="Create a session by choosing exercises from your library."/>}

    {selected && <Modal title={`Day ${selected.dayNumber} · ${formatDate(selected.date)}`} onClose={() => setSelected(undefined)} wide><div className="session-detail">
      <div className="detail-stats"><span><small>STATUS</small><strong>{selected.status}</strong></span><span><small>DURATION</small><strong>{selected.actualDuration ?? selected.plannedDuration} min</strong></span><span><small>COMPLETION</small><strong>{sessionCompletion(selected, results)}%</strong></span><div className="detail-satisfaction"><small>SATISFACTION</small><SatisfactionArc value={selected.satisfaction} compact/></div></div>
      <div className="detail-exercises">{[...selected.exercises].sort((a, b) => a.order - b.order).map((item) => { const exercise = exercises.find((entry) => entry.id === item.exerciseId); const result = results.find((entry) => entry.sessionExerciseId === item.id); const level = item.performanceLevel ?? result?.performanceLevel; return <div key={item.id}><div><strong>{exercise?.name ?? 'Removed exercise'}</strong><span>{item.bpm ? `${item.bpm} BPM` : 'No click'}</span></div>{result?.skipped ? <span className="result-chip">Skipped</span> : level ? <ExerciseLevelBadge level={level}/> : <span className="result-chip">{selected.status === 'completed' ? 'Legacy · ungraded' : 'Not logged'}</span>}</div>})}</div>
      {selected.notes && <div className="session-note"><small>SESSION NOTES</small><p>{selected.notes}</p></div>}
      <div className="modal-actions"><Button variant="ghost" icon={<Trash2/>} onClick={() => { setDeleting(selected); setSelected(undefined) }}>Delete</Button><Button variant="secondary" icon={<Pencil/>} onClick={() => { setEditing(selected); setSelected(undefined) }}>Edit</Button><Button variant="secondary" icon={<Copy/>} onClick={async () => { await duplicateSession(selected); setSelected(undefined) }}>Duplicate as new</Button><Button onClick={() => setSelected(undefined)}>Done</Button></div>
    </div></Modal>}

    {editing && <SessionComposer session={editing === 'new' ? undefined : editing} exercises={exercises} nextDayNumber={nextDayNumber} defaultDuration={settings?.defaultSessionDuration ?? 40} defaultPhase={settings?.currentPhase ?? 'Foundation'} onClose={() => setEditing(undefined)}/>}

    {deleting && <Modal title={`Delete Day ${deleting.dayNumber}?`} onClose={() => setDeleting(undefined)}><div className="confirm-reset"><p>This removes the session and its exercise results. Your exercise library will stay intact.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setDeleting(undefined)}>Cancel</Button><Button variant="danger" icon={<Trash2/>} onClick={() => removeSession(deleting)}>Delete session</Button></div></div></Modal>}
  </>
}
