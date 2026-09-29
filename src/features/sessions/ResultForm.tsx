import { useState } from 'react'
import type { Exercise, ExerciseResult, ResultState, SessionExercise } from '../../types'
import { Button } from '../../components/Button'

const states: { state: ResultState; icon: string }[] = [{ state: 'Clean', icon: '●' }, { state: 'Good', icon: '●' }, { state: 'Some mistakes', icon: '●' }, { state: 'Difficult', icon: '●' }, { state: 'Failed / retry later', icon: '●' }]

export function ResultForm({ exercise, sessionExercise, sessionId, onSave, onCancel }: { exercise: Exercise; sessionExercise: SessionExercise; sessionId: string; onSave: (result: ExerciseResult) => void; onCancel: () => void }) {
  const [state, setState] = useState<ResultState>('Good')
  const [bpmUsed, setBpmUsed] = useState(sessionExercise.bpm ?? exercise.bpm ?? 65)
  const [comfort, setComfort] = useState(3)
  const [mistakes, setMistakes] = useState<number | undefined>()
  const [note, setNote] = useState('')
  const [measured, setMeasured] = useState<number | undefined>()
  const isTiming = exercise.id === 'timing-test'
  return <div className="result-form">
    <p className="result-form__prompt">How did that feel?</p>
    <div className="result-options">{states.map((item) => <button key={item.state} className={state === item.state ? 'selected' : ''} onClick={() => setState(item.state)}><span>{item.icon}</span>{item.state}</button>)}</div>
    <div className="form-grid">
      <label><span>BPM used</span><input type="number" min="30" max="240" value={bpmUsed} onChange={(e) => setBpmUsed(Number(e.target.value))}/></label>
      <label><span>Mistakes <em>optional</em></span><input type="number" min="0" placeholder="—" value={mistakes ?? ''} onChange={(e) => setMistakes(e.target.value ? Number(e.target.value) : undefined)}/></label>
      {isTiming && <label><span>Observed BPM</span><input type="number" min="30" max="240" placeholder="e.g. 69" value={measured ?? ''} onChange={(e) => setMeasured(e.target.value ? Number(e.target.value) : undefined)}/></label>}
      <label className="comfort-field"><span>Comfort <em>{comfort}/5</em></span><input type="range" min="1" max="5" value={comfort} onChange={(e) => setComfort(Number(e.target.value))}/></label>
      <label className="wide"><span>Quick note <em>optional</em></span><input placeholder="What did you notice?" value={note} onChange={(e) => setNote(e.target.value)}/></label>
    </div>
    <div className="modal-actions"><Button variant="ghost" onClick={onCancel}>Keep practicing</Button><Button onClick={() => onSave({ id: crypto.randomUUID(), sessionId, sessionExerciseId: sessionExercise.id, exerciseId: exercise.id, state, bpmUsed, mistakeCount: mistakes, comfort, note: note.trim() || undefined, targetBpm: isTiming ? bpmUsed : undefined, measuredBpm: isTiming ? measured : undefined, completedAt: new Date().toISOString() })}>Save & continue</Button></div>
  </div>
}
