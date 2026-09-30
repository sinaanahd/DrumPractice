import { ArrowLeft, ArrowRight, Check, ChevronLeft, CirclePause, Play, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Metronome } from '../../components/Metronome'
import { Modal } from '../../components/Modal'
import { db } from '../../db/database'
import { activeSessionStore, useActiveSession } from '../../store/activeSession'
import type { Exercise, ExerciseResult, PracticeSession, Settings } from '../../types'
import { formatDuration } from '../../utils/calculations'
import { ResultForm } from './ResultForm'
import { SessionSummary } from './SessionSummary'
import { levelFromResultState } from '../../components/ExerciseLevelBadge'

export function PracticeMode({ session, exercises, results, settings }: { session: PracticeSession; exercises: Exercise[]; results: ExerciseResult[]; settings: Settings }) {
  const active = useActiveSession()
  const ordered = useMemo(() => [...session.exercises].sort((a,b) => a.order-b.order), [session.exercises])
  const current = ordered[Math.min(active.index, ordered.length - 1)]
  const exercise = exercises.find((item) => item.id === current?.exerciseId)
  const [logging, setLogging] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const sessionResults = results.filter((result) => result.sessionId === session.id)
  const previousResult = results.filter((result) => result.exerciseId === exercise?.id && result.sessionId !== session.id).at(-1)
  const timerTotal = current?.durationSeconds ?? 0

  useEffect(() => {
    if (!current) return
    const fresh = active.timerSeconds === 0 || active.index !== ordered.findIndex((item) => item.id === current.id)
    if (fresh) activeSessionStore.set({ timerSeconds: timerTotal, timerMode: timerTotal ? 'countdown' : 'stopwatch', timerRunning: false })
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active.timerRunning) return
    const id = window.setInterval(() => {
      const now = activeSessionStore.getSnapshot()
      if (now.timerMode === 'countdown') activeSessionStore.set({ timerSeconds: Math.max(0, now.timerSeconds - 1), timerRunning: now.timerSeconds > 1 })
      else activeSessionStore.set({ timerSeconds: now.timerSeconds + 1 })
    }, 1000)
    return () => window.clearInterval(id)
  }, [active.timerRunning])

  if (!exercise || !current) return null
  const done = sessionResults.some((result) => result.sessionExerciseId === current.id)
  const go = (index: number) => activeSessionStore.set({ index: Math.max(0, Math.min(ordered.length - 1, index)), timerSeconds: 0, timerRunning: false })
  const finish = async () => { const start = session.startedAt ? new Date(session.startedAt).getTime() : Date.now(); await db.sessions.update(session.id, { status: 'completed', completedAt: new Date().toISOString(), actualDuration: session.actualDuration ?? Math.max(1, Math.round((Date.now() - start) / 60000)) }); setFinishing(true) }
  return <div className="practice-mode">
    <header className="practice-header"><button onClick={async () => { await db.sessions.update(session.id, { status: 'planned' }); activeSessionStore.reset() }}><ChevronLeft/> Exit practice</button><div><span>DAY {session.dayNumber}</span><strong>{active.index + 1} <i>/</i> {ordered.length}</strong></div><button className="end-link" onClick={finish}>Finish session</button></header>
    <div className="practice-progress"><span style={{ width: `${((active.index + 1) / ordered.length) * 100}%` }}/></div>
    <main className="practice-content">
      <section className="practice-exercise">
        <div className="exercise-badges"><span className="pill">{exercise.category.toUpperCase()}</span><span className={`status-tag status-tag--${exercise.status.toLowerCase()}`}>{exercise.status}</span>{current.optional && <span className="pill pill--outline">OPTIONAL</span>}</div>
        <h1>{exercise.name}</h1><p className="practice-purpose">{exercise.purpose}</p>
        <div className="pattern-display"><span>PATTERN</span><strong>{exercise.pattern ?? 'Free practice'}</strong></div>
        <div className="instruction-block"><span className="eyebrow">HOW TO PRACTICE</span><ol>{exercise.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span>{instruction}</li>)}</ol></div>
        {exercise.notes && <div className="coach-note"><strong>Keep in mind</strong><p>{exercise.notes}</p></div>}
        {previousResult && <p className="previous-result">Last time: <strong>{previousResult.state}</strong>{previousResult.note ? ` · “${previousResult.note}”` : ''}</p>}
      </section>
      <aside className="practice-tools">
        <div className="timer-card"><span className="eyebrow">{active.timerMode === 'countdown' ? 'TIME REMAINING' : 'ELAPSED TIME'}</span><strong>{formatDuration(active.timerSeconds)}</strong><div className="timer-track"><span style={{ width: timerTotal ? `${Math.max(0, Math.min(100, (1 - active.timerSeconds / timerTotal) * 100))}%` : '0%' }}/></div><Button onClick={() => activeSessionStore.set({ timerRunning: !active.timerRunning })} icon={active.timerRunning ? <CirclePause/> : <Play fill="currentColor"/>}>{active.timerRunning ? 'Pause' : active.timerSeconds === timerTotal ? 'Start timer' : 'Resume'}</Button></div>
        <Metronome prescribedBpm={current.bpm} defaultVolume={settings.metronomeVolume} compact/>
        <div className="practice-quote">“Control first. Speed will follow.”</div>
      </aside>
    </main>
    <footer className="practice-footer"><Button variant="ghost" disabled={active.index === 0} onClick={() => go(active.index - 1)} icon={<ArrowLeft/>}>Previous</Button><div><Button variant="secondary" onClick={async () => { const state = 'Difficult' as const; await db.results.put({ id: crypto.randomUUID(), sessionId: session.id, sessionExerciseId: current.id, exerciseId: exercise.id, state, performanceLevel: current.performanceLevel ?? levelFromResultState(state), completedAt: new Date().toISOString(), skipped: true }); if (active.index === ordered.length - 1) await finish(); else go(active.index + 1) }} icon={<SkipForward/>}>Skip</Button><Button disabled={done} onClick={() => setLogging(true)} icon={<Check/>}>{done ? 'Completed' : 'Complete exercise'}</Button><Button variant="ghost" disabled={active.index === ordered.length - 1} aria-label="Next" onClick={() => go(active.index + 1)} icon={<ArrowRight/>}/></div></footer>
    {logging && <Modal title={`Complete · ${exercise.name}`} onClose={() => setLogging(false)} wide><ResultForm exercise={exercise} sessionExercise={current} sessionId={session.id} onCancel={() => setLogging(false)} onSave={async (result) => { await db.results.put(result); setLogging(false); if (active.index === ordered.length - 1) await finish(); else go(active.index + 1) }}/></Modal>}
    {finishing && <SessionSummary session={{ ...session, status: 'completed' }} exercises={exercises} results={sessionResults} onDone={() => { activeSessionStore.reset(); setFinishing(false) }}/>} 
  </div>
}
