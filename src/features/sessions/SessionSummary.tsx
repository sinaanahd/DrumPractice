import { CheckCircle2, Clock3, Target, X } from 'lucide-react'
import { useState } from 'react'
import type { Exercise, ExerciseResult, PracticeSession } from '../../types'
import { db } from '../../db/database'
import { Button } from '../../components/Button'
import { SatisfactionArc } from '../../components/SatisfactionArc'

export function SessionSummary({ session, exercises, results, onDone }: { session: PracticeSession; exercises: Exercise[]; results: ExerciseResult[]; onDone: () => void }) {
  const [notes, setNotes] = useState(session.notes ?? '')
  const [satisfaction, setSatisfaction] = useState(session.satisfaction ?? 100)
  const complete = results.filter((result) => !result.skipped)
  const strongest = complete.find((r) => r.state === 'Clean' || r.state === 'Good')
  const needsWork = complete.find((r) => r.state === 'Difficult' || r.state === 'Failed / retry later')
  const name = (id?: string) => exercises.find((exercise) => exercise.id === id)?.name ?? '—'
  return <div className="summary-screen"><button className="summary-close" onClick={onDone}><X/></button><div className="summary-check"><CheckCircle2/></div><span className="eyebrow">SESSION COMPLETE</span><h1>Day {session.dayNumber}, done.</h1><p>You showed up and worked the pulse. That matters more than a perfect log.</p><div className="summary-metrics"><div><Clock3/><strong>{session.actualDuration ?? Math.max(1, Math.round(((Date.now() - new Date(session.startedAt ?? Date.now()).getTime()) / 60000)))} min</strong><span>Practice time</span></div><div><Target/><strong>{complete.length}/{session.exercises.length}</strong><span>Exercises complete</span></div><div><CheckCircle2/><strong>{complete.filter((r) => r.state === 'Clean' || r.state === 'Good').length}</strong><span>Clean or good</span></div></div><div className="summary-satisfaction"><SatisfactionArc value={satisfaction}/><label><span>How satisfying was this session? <strong>{satisfaction}/100</strong></span><input type="range" min="0" max="100" value={satisfaction} onChange={(event) => setSatisfaction(Number(event.target.value))}/></label></div><div className="summary-findings"><div><span>STRONGEST AREA</span><strong>{name(strongest?.exerciseId)}</strong></div><div><span>KEEP DEVELOPING</span><strong>{name(needsWork?.exerciseId)}</strong></div></div><label className="summary-notes"><span>Session notes</span><textarea rows={3} placeholder="What do you want to remember from today?" value={notes} onChange={(e) => setNotes(e.target.value)}/></label><Button onClick={async () => { await db.sessions.update(session.id, { notes, satisfaction, status: 'completed' }); onDone() }}>Save & return to Today</Button></div>
}
