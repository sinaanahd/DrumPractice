import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { db } from '../../db/database'
import type { Exercise, PracticeSession, SessionExercise, SessionStatus } from '../../types'
import { performanceLevels } from '../../components/ExerciseLevelBadge'

export function SessionComposer({ session, exercises, nextDayNumber, defaultDuration, defaultPhase, onClose }: { session?: PracticeSession; exercises: Exercise[]; nextDayNumber: number; defaultDuration: number; defaultPhase: string; onClose: () => void }) {
  const [dayNumber, setDayNumber] = useState(session?.dayNumber ?? nextDayNumber)
  const [date, setDate] = useState(session?.date ?? new Date().toISOString().slice(0, 10))
  const [plannedDuration, setPlannedDuration] = useState(session?.plannedDuration ?? defaultDuration)
  const [actualDuration, setActualDuration] = useState<number | ''>(session?.actualDuration ?? '')
  const [status, setStatus] = useState<SessionStatus>(session?.status ?? 'planned')
  const [satisfaction, setSatisfaction] = useState(session?.satisfaction ?? 100)
  const [noMetronomeTestValue, setNoMetronomeTestValue] = useState<number | ''>(session?.noMetronomeTestValue ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [items, setItems] = useState<SessionExercise[]>([...(session?.exercises ?? [])].sort((a, b) => a.order - b.order))
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '')
  const selectedIds = useMemo(() => new Set(items.map((item) => item.exerciseId)), [items])

  const addExercise = () => {
    const exercise = exercises.find((item) => item.id === exerciseId)
    if (!exercise) return
    setItems([...items, { id: crypto.randomUUID(), exerciseId: exercise.id, order: items.length, bpm: exercise.bpm, durationSeconds: exercise.durationSeconds, repetitions: exercise.repetitions, optional: exercise.optional }])
  }
  const updateItem = (id: string, change: Partial<SessionExercise>) => setItems(items.map((item) => item.id === id ? { ...item, ...change } : item))
  const move = (index: number, delta: number) => {
    const target = index + delta; if (target < 0 || target >= items.length) return
    const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; setItems(copy.map((item, order) => ({ ...item, order })))
  }

  return <Modal title={session ? `Edit Day ${session.dayNumber}` : 'Build a new session'} onClose={onClose} wide>
    <form className="session-composer" onSubmit={async (event) => {
      event.preventDefault()
      const value: PracticeSession = { id: session?.id ?? crypto.randomUUID(), dayNumber, date, phase: session?.phase ?? defaultPhase, plannedDuration, actualDuration: actualDuration === '' ? undefined : actualDuration, status, exercises: items.map((item, order) => ({ ...item, order })), satisfaction, noMetronomeTestValue: noMetronomeTestValue === '' ? undefined : noMetronomeTestValue, energy: session?.energy, notes: notes.trim() || undefined, startedAt: session?.startedAt, completedAt: session?.completedAt }
      await db.transaction('rw', [db.sessions, db.results], async () => {
        await db.sessions.put(value)
        if (session) {
          const retainedIds = new Set(value.exercises.map((item) => item.id))
          const removedIds = new Set(session.exercises.map((item) => item.id).filter((id) => !retainedIds.has(id)))
          if (removedIds.size) await db.results.where('sessionId').equals(session.id).filter((result) => removedIds.has(result.sessionExerciseId)).delete()
        }
      })
      onClose()
    }}>
      <div className="composer-meta"><label><span>Day number</span><input type="number" min="1" required value={dayNumber} onChange={(event) => setDayNumber(Number(event.target.value))}/></label><label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><label><span>Planned duration</span><input type="number" min="0" max="180" required value={plannedDuration} onChange={(event) => setPlannedDuration(Number(event.target.value))}/></label><label><span>Actual duration <em>optional</em></span><input type="number" min="0" max="180" placeholder="Minutes" value={actualDuration} onChange={(event) => setActualDuration(event.target.value === '' ? '' : Number(event.target.value))}/></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as SessionStatus)}><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="partial">Partial</option></select></label><label className="no-metronome-input"><span>No-metronome test</span><input type="number" min="0" max="240" placeholder="Enter value" value={noMetronomeTestValue} onChange={(event) => setNoMetronomeTestValue(event.target.value === '' ? '' : Number(event.target.value))}/><small>{noMetronomeTestValue === '' ? 'Optional' : `Recorded value: ${noMetronomeTestValue}`}</small></label></div>
      <label className="satisfaction-input"><span>Session satisfaction <strong>{satisfaction}/100</strong></span><input type="range" min="0" max="100" value={satisfaction} onChange={(event) => setSatisfaction(Number(event.target.value))}/><small>How satisfying did this session feel?</small></label>
      <div className="composer-picker"><label><span>Add from exercise library</span><select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name} · {exercise.category}{selectedIds.has(exercise.id) ? ' (already added)' : ''}</option>)}</select></label><Button type="button" variant="secondary" icon={<Plus/>} onClick={addExercise}>Add exercise</Button></div>
      <div className="composer-list">{items.length === 0 ? <div className="composer-empty">Choose exercises above to build this session.</div> : items.map((item, index) => { const exercise = exercises.find((entry) => entry.id === item.exerciseId); return <div className="composer-row" key={item.id}><div className="composer-order"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${exercise?.name} up`}><ArrowUp/></button><button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${exercise?.name} down`}><ArrowDown/></button></div><div className="composer-name"><strong>{exercise?.name ?? 'Missing exercise'}</strong><span>{exercise?.category}</span></div><label><span>BPM</span><input type="number" min="30" max="240" value={item.bpm ?? ''} placeholder="—" onChange={(event) => updateItem(item.id, { bpm: event.target.value ? Number(event.target.value) : undefined })}/></label><label><span>Minutes</span><input type="number" min="1" value={item.durationSeconds ? Math.ceil(item.durationSeconds / 60) : ''} placeholder="—" onChange={(event) => updateItem(item.id, { durationSeconds: event.target.value ? Number(event.target.value) * 60 : undefined })}/></label><label className="check-label"><input type="checkbox" checked={item.optional} onChange={(event) => updateItem(item.id, { optional: event.target.checked })}/><span>Optional</span></label><div className="composer-levels" role="group" aria-label={`Level for ${exercise?.name ?? 'exercise'}`}>{performanceLevels.map(({ level, Icon }) => <button type="button" key={level} data-tooltip={level} aria-label={`${level} level`} className={item.performanceLevel === level ? `selected performance-level--${level.toLowerCase().replaceAll(' ', '-')}` : ''} onClick={() => updateItem(item.id, { performanceLevel: level })}><Icon aria-hidden="true"/></button>)}</div><button type="button" className="icon-button danger" aria-label={`Remove ${exercise?.name}`} onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}><Trash2/></button></div> })}</div>
      <label className="composer-notes"><span>Session notes <em>optional</em></span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What should this session focus on?"/></label>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={items.length === 0}>{session ? 'Save changes' : 'Create session'}</Button></div>
    </form>
  </Modal>
}
