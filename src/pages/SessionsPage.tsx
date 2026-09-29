import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, Copy, FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/database'
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
  const filtered = sessions.filter((session) => filter === 'All' || filter === 'Completed' && session.status === 'completed' || filter === 'Partial' && session.status === 'partial' || filter === 'Difficult' && results.some((r) => r.sessionId === session.id && (r.state === 'Difficult' || r.state === 'Failed / retry later')))
  const createSession = async (source?: PracticeSession) => { const highest = Math.max(0, ...sessions.map((s) => s.dayNumber)); const next: PracticeSession = { id: crypto.randomUUID(), dayNumber: highest + 1, date: new Date().toISOString().slice(0,10), phase: settings?.currentPhase ?? 'Foundation', plannedDuration: settings?.defaultSessionDuration ?? 40, status: 'planned', exercises: source ? source.exercises.map((item) => ({ ...item, id: crypto.randomUUID() })) : [] }; await db.sessions.add(next) }
  return <>
    <PageHeader eyebrow="PRACTICE LOG" title="Sessions" subtitle="Your practice history, without judgment." action={<Button icon={<Plus/>} onClick={() => createSession(sessions[0])}>New session</Button>}/>
    <div className="filter-tabs">{(['All','Completed','Partial','Difficult'] as Filter[]).map((item) => <button className={filter===item?'active':''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
    {filtered.length ? <div className="session-list">{filtered.map((session) => { const sessionResults = results.filter((r) => r.sessionId === session.id); const completion = sessionCompletion(session, results); const workingBpm = sessionResults.map((r) => r.bpmUsed ?? 0).sort((a,b)=>b-a)[0]; const difficult = sessionResults.filter((r) => r.state === 'Difficult' || r.state === 'Failed / retry later').length; return <button className="session-card" onClick={() => setSelected(session)} key={session.id}><div className="session-day"><span>{String(session.dayNumber).padStart(2,'0')}</span><small>DAY</small></div><div className="session-primary"><strong>{formatDate(session.date)}</strong><span>{session.phase} phase</span></div><div className="session-data"><span><small>DURATION</small><strong>{session.actualDuration ? `${session.actualDuration} min` : 'Planned'}</strong></span><span><small>COMPLETION</small><strong>{completion}%</strong></span><span><small>WORKING BPM</small><strong>{workingBpm || '—'}</strong></span></div><div className="session-result"><span className={`session-state session-state--${session.status}`}>{session.status}</span>{difficult > 0 && <small>{difficult} difficult</small>}{session.notes && <FileText size={15}/>}</div><ChevronRight/></button>})}</div> : <EmptyState icon={<CalendarDays/>} title="No sessions here yet" message="Completed practice sessions will build a calm, useful history over time."/>}
    {selected && <Modal title={`Day ${selected.dayNumber} · ${formatDate(selected.date)}`} onClose={() => setSelected(undefined)} wide><div className="session-detail"><div className="detail-stats"><span><small>STATUS</small><strong>{selected.status}</strong></span><span><small>DURATION</small><strong>{selected.actualDuration ?? selected.plannedDuration} min</strong></span><span><small>COMPLETION</small><strong>{sessionCompletion(selected, results)}%</strong></span></div><div className="detail-exercises">{[...selected.exercises].sort((a,b)=>a.order-b.order).map((item) => { const exercise = exercises.find((e)=>e.id===item.exerciseId); const result = results.find((r)=>r.sessionExerciseId===item.id); return <div key={item.id}><div><strong>{exercise?.name ?? 'Removed exercise'}</strong><span>{item.bpm ? `${item.bpm} BPM` : 'No click'}</span></div><span className={result ? `result-chip result-chip--${result.state.toLowerCase().replaceAll(' ','-').replaceAll('/','')}` : 'result-chip'}>{result?.skipped ? 'Skipped' : result?.state ?? 'Not logged'}</span></div>})}</div>{selected.notes && <div className="session-note"><small>SESSION NOTES</small><p>{selected.notes}</p></div>}<div className="modal-actions"><Button variant="secondary" icon={<Copy/>} onClick={async () => { await createSession(selected); setSelected(undefined) }}>Duplicate as new</Button><Button onClick={() => setSelected(undefined)}>Done</Button></div></div></Modal>}
  </>
}
