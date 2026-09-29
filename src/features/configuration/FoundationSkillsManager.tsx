import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { db } from '../../db/database'
import type { FoundationSkill, SkillStatus } from '../../types'
import { removeAndReorder, reorder } from '../../utils/ordering'

const levels: SkillStatus[] = ['New', 'Developing', 'Comfortable', 'Solid']

export function FoundationSkillsManager() {
  const skills = useLiveQuery(() => db.foundationSkills.orderBy('order').toArray(), []) ?? []
  const [editing, setEditing] = useState<FoundationSkill | 'new'>()
  const [removing, setRemoving] = useState<FoundationSkill>()

  const move = async (id: string, delta: number) => db.foundationSkills.bulkPut(reorder(skills, id, delta))
  const remove = async () => {
    if (!removing) return
    await db.transaction('rw', db.foundationSkills, async () => { await db.foundationSkills.delete(removing.id); await db.foundationSkills.bulkPut(removeAndReorder(skills, removing.id)) })
    setRemoving(undefined)
  }

  return <section className="panel skills-panel configuration-panel">
    <div className="panel__header"><div><span className="eyebrow">SKILL PROGRESS</span><h2>Foundation skills</h2><p>Use descriptive levels—never arbitrary scores.</p></div><Button variant="secondary" icon={<Plus/>} onClick={() => setEditing('new')}>Add skill</Button></div>
    <div className="foundation-skill-list">{skills.map((skill, index) => { const active = levels.indexOf(skill.level); return <article className="skill-row skill-row--editable" key={skill.id}><div><strong>{skill.name}</strong><span>{skill.description}</span>{skill.notes && <small>{skill.notes}</small>}</div><div className="skill-track">{levels.map((level, levelIndex) => <i key={level} className={levelIndex <= active ? 'filled' : ''}/>)}</div><span className={`status-tag status-tag--${skill.level.toLowerCase()}`}>{skill.level}</span><div className="configuration-actions"><button disabled={index === 0} onClick={() => move(skill.id, -1)} aria-label={`Move ${skill.name} up`}><ArrowUp/></button><button disabled={index === skills.length - 1} onClick={() => move(skill.id, 1)} aria-label={`Move ${skill.name} down`}><ArrowDown/></button><button onClick={() => setEditing(skill)} aria-label={`Edit ${skill.name}`}><Pencil/></button><button className="danger" onClick={() => setRemoving(skill)} aria-label={`Delete ${skill.name}`}><Trash2/></button></div></article>})}</div>

    {editing && <Modal title={editing === 'new' ? 'Add foundation skill' : 'Edit foundation skill'} onClose={() => setEditing(undefined)}><form className="configuration-form" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const value: FoundationSkill = { id: editing === 'new' ? crypto.randomUUID() : editing.id, name: String(data.get('name')).trim(), description: String(data.get('description')).trim() || undefined, level: String(data.get('level')) as SkillStatus, notes: String(data.get('notes')).trim() || undefined, order: editing === 'new' ? skills.length : editing.order }; await db.foundationSkills.put(value); setEditing(undefined) }}><label><span>Name</span><input name="name" required autoFocus defaultValue={editing === 'new' ? '' : editing.name}/></label><label><span>Description <em>optional</em></span><textarea name="description" rows={2} defaultValue={editing === 'new' ? '' : editing.description}/></label><label><span>Current level</span><select name="level" defaultValue={editing === 'new' ? 'New' : editing.level}>{levels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label><span>Notes <em>optional</em></span><textarea name="notes" rows={3} defaultValue={editing === 'new' ? '' : editing.notes}/></label><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit">Save skill</Button></div></form></Modal>}

    {removing && <Modal title={`Delete ${removing.name}?`} onClose={() => setRemoving(undefined)}><div className="confirm-reset"><p>This removes the skill from your Foundation Skills list. Exercises and practice history stay intact.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setRemoving(undefined)}>Cancel</Button><Button variant="danger" icon={<Trash2/>} onClick={remove}>Delete skill</Button></div></div></Modal>}
  </section>
}
