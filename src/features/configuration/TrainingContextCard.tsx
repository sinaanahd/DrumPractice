import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { db } from '../../db/database'
import type { Settings } from '../../types'

export function TrainingContextCard({ settings, progress = false }: { settings: Settings; progress?: boolean }) {
  const [editing, setEditing] = useState(false)
  return <section className={`panel training-context ${progress ? 'training-context--progress' : 'focus-card'}`}>
    <div className="panel__header"><div><span className="eyebrow">CURRENT TRAINING CONTEXT</span><h2>{settings.currentFocus}</h2><p>{settings.currentPhase} phase · Current reference values only; historical sessions stay unchanged.</p></div><Button variant="ghost" icon={<Pencil/>} onClick={() => setEditing(true)}>Edit</Button></div>
    <div className="tempo-row"><span><small>FOUNDATION</small><strong>{settings.foundationBpm} BPM</strong></span><i/><span><small>WORKING</small><strong>{settings.workingBpm} BPM</strong></span><i/><span><small>CHALLENGE</small><strong>{settings.challengeBpm} BPM</strong></span></div>
    {editing && <ContextEditor settings={settings} onClose={() => setEditing(false)}/>} 
  </section>
}

function ContextEditor({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  return <Modal title="Edit training context" onClose={onClose}>
    <form className="configuration-form" onSubmit={async (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      await db.settings.update('settings', {
        currentPhase: String(form.get('phase')).trim(),
        currentFocus: String(form.get('focus')).trim(),
        foundationBpm: Number(form.get('foundation')),
        workingBpm: Number(form.get('working')),
        challengeBpm: Number(form.get('challenge'))
      })
      onClose()
    }}>
      <label><span>Current phase</span><input name="phase" required defaultValue={settings.currentPhase}/></label>
      <label><span>Current focus</span><input name="focus" required defaultValue={settings.currentFocus}/></label>
      <div className="configuration-form__columns">
        <label><span>Foundation BPM</span><input name="foundation" type="number" min="20" max="300" required defaultValue={settings.foundationBpm}/></label>
        <label><span>Working BPM</span><input name="working" type="number" min="20" max="300" required defaultValue={settings.workingBpm}/></label>
        <label><span>Challenge BPM</span><input name="challenge" type="number" min="20" max="300" required defaultValue={settings.challengeBpm}/></label>
      </div>
      <p className="form-hint">Changing this context does not rewrite exercise prescriptions or historical results.</p>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save context</Button></div>
    </form>
  </Modal>
}
