import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Clock3, Edit3, Play, RotateCcw, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db } from '../db/database'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { Metronome } from '../components/Metronome'
import { PracticeMode } from '../features/sessions/PracticeMode'
import { SessionEditor } from '../features/sessions/SessionEditor'
import { TrainingContextCard } from '../features/configuration/TrainingContextCard'
import { activeSessionStore, useActiveSession } from '../store/activeSession'
import { formatDate, noMetronomeTestResult } from '../utils/calculations'

export function TodayPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('dayNumber').reverse().toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const results = useLiveQuery(() => db.results.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const active = useActiveSession()
  const [editing, setEditing] = useState(false)
  const session = useMemo(() => active.sessionId ? sessions?.find((item) => item.id === active.sessionId) : sessions?.find((item) => item.status === 'planned' || item.status === 'active') ?? sessions?.[0], [sessions, active.sessionId])
  if (!session || !exercises || !results || !settings) return <div className="loading">Loading your practice space…</div>
  if (active.sessionId === session.id || session.status === 'active') return <PracticeMode session={session} exercises={exercises} results={results} settings={settings}/>
  const latestTiming = (sessions ?? []).map((item) => noMetronomeTestResult(item, results)).find((value) => value != null)
  const recent = sessions?.find((item) => item.status === 'completed' || item.status === 'partial')
  return <>
    <PageHeader eyebrow="TODAY'S PRACTICE" title={`Day ${session.dayNumber}`} subtitle={`${formatDate(session.date)} · ${settings.currentPhase} phase`} action={<Button variant="secondary" onClick={() => setEditing(true)} icon={<Edit3 size={17}/>}>Edit plan</Button>}/>
    <section className="hero-card">
      <div className="hero-card__copy"><span className="pill pill--green">READY WHEN YOU ARE</span><h2>Build the pulse.<br/><em>Keep it relaxed.</em></h2><p>Today is about control through transitions. Speed is optional; a clean return to the pulse is the win.</p><div className="hero-meta"><span><Clock3 size={18}/><strong>{session.plannedDuration} min</strong><small>planned</small></span><span><Target size={18}/><strong>{session.exercises.length} exercises</strong><small>{session.exercises.filter((e) => e.optional).length} optional</small></span></div><Button className="start-button" onClick={async () => { await db.sessions.update(session.id, { status: 'active', startedAt: new Date().toISOString() }); activeSessionStore.set({ sessionId: session.id, index: 0 }) }} icon={<Play fill="currentColor" size={19}/>}>Start session <ArrowRight size={18}/></Button></div>
      <div className="hero-card__tempo"><Metronome prescribedBpm={settings.workingBpm} defaultVolume={settings.metronomeVolume}/></div>
    </section>
    <div className="today-grid">
      <section className="panel session-outline"><div className="panel__header"><div><span className="eyebrow">SESSION PLAN</span><h2>Today’s flow</h2></div><span className="soft-label">~{session.plannedDuration} MIN</span></div>
        <ol>{session.exercises.sort((a,b) => a.order-b.order).map((item, index) => { const exercise = exercises.find((e) => e.id === item.exerciseId); if (!exercise) return null; return <li key={item.id}><span className="step-number">{String(index + 1).padStart(2,'0')}</span><div><strong>{exercise.name}</strong><small>{item.bpm ? `${item.bpm} BPM` : 'No click'} · {item.durationSeconds ? `${Math.ceil(item.durationSeconds/60)} min` : `${item.repetitions} reps`}</small></div><span className={`status-tag status-tag--${exercise.status.toLowerCase()}`}>{item.optional ? 'Optional' : exercise.status}</span></li> })}</ol>
      </section>
      <aside className="side-stack">
        <TrainingContextCard settings={settings}/>
        <section className="panel recovery-card"><div className="recovery-icon"><RotateCcw/></div><div><span className="eyebrow">WHEN IT GETS DIFFICULT</span><h2>Recovery protocol</h2></div>{['Slow down','Shorten the pattern','Isolate the problem','Count aloud','Rebuild the pattern'].map((text, i) => <div className="recovery-step" key={text}><span>{i+1}</span>{text}</div>)}<p>Returning to a simpler pulse is good technique—not failure.</p></section>
        <section className="panel quick-progress"><div className="panel__header"><div><span className="eyebrow">QUICK LOOK</span><h2>Latest progress</h2></div></div><div className="quick-stat"><span>No-metronome test</span><strong>{latestTiming ?? 'Not logged yet'}</strong></div><div className="quick-stat"><span>Recent session</span><strong>{recent ? `Day ${recent.dayNumber} · ${recent.status}` : 'Your journey starts here'}</strong></div></section>
      </aside>
    </div>
    {editing && <SessionEditor session={session} exercises={exercises} onClose={() => setEditing(false)}/>} 
  </>
}
