import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { db } from '../../db/database'
import type { RoadmapGroup, RoadmapItem, RoadmapStatus } from '../../types'
import { removeAndReorder, reorder } from '../../utils/ordering'

type RemoveTarget = { kind: 'item' | 'group'; id: string; name: string }

export function RoadmapManager() {
  const groups = useLiveQuery(() => db.roadmapGroups.orderBy('order').toArray(), []) ?? []
  const items = useLiveQuery(() => db.roadmap.orderBy('order').toArray(), []) ?? []
  const [groupForm, setGroupForm] = useState<RoadmapGroup | 'new'>()
  const [itemForm, setItemForm] = useState<{ item?: RoadmapItem; groupId: string }>()
  const [removing, setRemoving] = useState<RemoveTarget>()

  const moveGroup = async (id: string, delta: number) => db.roadmapGroups.bulkPut(reorder(groups, id, delta))
  const moveItem = async (groupId: string, id: string, delta: number) => db.roadmap.bulkPut(reorder(items.filter((item) => item.groupId === groupId), id, delta))

  const saveItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!itemForm) return
    const data = new FormData(event.currentTarget)
    const groupId = String(data.get('groupId'))
    const previousGroup = itemForm.item?.groupId
    const targetItems = items.filter((item) => item.groupId === groupId && item.id !== itemForm.item?.id)
    const value: RoadmapItem = {
      id: itemForm.item?.id ?? crypto.randomUUID(),
      title: String(data.get('title')).trim(),
      description: String(data.get('description')).trim() || undefined,
      notes: String(data.get('notes')).trim() || undefined,
      groupId,
      order: previousGroup === groupId ? itemForm.item?.order ?? targetItems.length : targetItems.length,
      status: String(data.get('status')) as RoadmapStatus || undefined
    }
    await db.transaction('rw', db.roadmap, async () => {
      await db.roadmap.put(value)
      if (previousGroup && previousGroup !== groupId) await db.roadmap.bulkPut(removeAndReorder(items.filter((item) => item.groupId === previousGroup), value.id))
    })
    setItemForm(undefined)
  }

  const remove = async () => {
    if (!removing) return
    if (removing.kind === 'item') {
      const item = items.find((entry) => entry.id === removing.id)
      if (item) await db.transaction('rw', db.roadmap, async () => { await db.roadmap.delete(item.id); await db.roadmap.bulkPut(removeAndReorder(items.filter((entry) => entry.groupId === item.groupId), item.id)) })
    } else if (!items.some((item) => item.groupId === removing.id)) {
      await db.roadmapGroups.delete(removing.id)
      await db.roadmapGroups.bulkPut(removeAndReorder(groups, removing.id))
    }
    setRemoving(undefined)
  }

  return <section className="panel roadmap-panel configuration-panel">
    <div className="panel__header"><div><span className="eyebrow">TRAINING ROADMAP</span><h2>One variable at a time</h2><p>Add, move, and reorder your own training goals.</p></div><Button variant="secondary" icon={<Plus/>} onClick={() => setGroupForm('new')}>Add group</Button></div>
    <div className="roadmap-groups">{groups.map((group, groupIndex) => {
      const groupItems = items.filter((item) => item.groupId === group.id).sort((left, right) => left.order - right.order)
      return <div className="roadmap-group roadmap-group--editable" key={group.id}>
        <header><strong>{group.name}</strong><div className="configuration-actions"><button disabled={groupIndex === 0} onClick={() => moveGroup(group.id, -1)} aria-label={`Move ${group.name} up`}><ArrowUp/></button><button disabled={groupIndex === groups.length - 1} onClick={() => moveGroup(group.id, 1)} aria-label={`Move ${group.name} down`}><ArrowDown/></button><button onClick={() => setGroupForm(group)} aria-label={`Edit ${group.name}`}><Pencil/></button><button className="danger" disabled={groupItems.length > 0} title={groupItems.length ? 'Move or delete this group’s items first' : 'Delete group'} onClick={() => setRemoving({ kind: 'group', id: group.id, name: group.name })} aria-label={`Delete ${group.name}`}><Trash2/></button></div></header>
        <div className="roadmap-items">{groupItems.map((item, index) => <article key={item.id}><div><strong>{item.title}</strong>{item.description && <span>{item.description}</span>}{item.status && <small>{item.status}</small>}</div><div className="configuration-actions"><button disabled={index === 0} onClick={() => moveItem(group.id, item.id, -1)} aria-label={`Move ${item.title} up`}><ArrowUp/></button><button disabled={index === groupItems.length - 1} onClick={() => moveItem(group.id, item.id, 1)} aria-label={`Move ${item.title} down`}><ArrowDown/></button><button onClick={() => setItemForm({ item, groupId: group.id })} aria-label={`Edit ${item.title}`}><Pencil/></button><button className="danger" onClick={() => setRemoving({ kind: 'item', id: item.id, name: item.title })} aria-label={`Delete ${item.title}`}><Trash2/></button></div></article>)}</div>
        <Button variant="ghost" icon={<Plus/>} onClick={() => setItemForm({ groupId: group.id })}>Add item</Button>
      </div>
    })}</div>

    {groupForm && <Modal title={groupForm === 'new' ? 'Add roadmap group' : 'Edit roadmap group'} onClose={() => setGroupForm(undefined)}><form className="configuration-form" onSubmit={async (event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name')).trim(); const value: RoadmapGroup = groupForm === 'new' ? { id: crypto.randomUUID(), name, order: groups.length } : { ...groupForm, name }; await db.roadmapGroups.put(value); setGroupForm(undefined) }}><label><span>Group name</span><input name="name" required autoFocus defaultValue={groupForm === 'new' ? '' : groupForm.name}/></label><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setGroupForm(undefined)}>Cancel</Button><Button type="submit">Save group</Button></div></form></Modal>}

    {itemForm && <Modal title={itemForm.item ? 'Edit roadmap item' : 'Add roadmap item'} onClose={() => setItemForm(undefined)}><form className="configuration-form" onSubmit={saveItem}><label><span>Title</span><input name="title" required autoFocus defaultValue={itemForm.item?.title}/></label><label><span>Description <em>optional</em></span><textarea name="description" rows={2} defaultValue={itemForm.item?.description}/></label><label><span>Group</span><select name="groupId" defaultValue={itemForm.item?.groupId ?? itemForm.groupId}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label><span>Status <em>optional</em></span><select name="status" defaultValue={itemForm.item?.status ?? ''}><option value="">No status</option>{(['planned', 'active', 'developing', 'comfortable', 'solid'] as RoadmapStatus[]).map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label><label><span>Notes <em>optional</em></span><textarea name="notes" rows={3} defaultValue={itemForm.item?.notes}/></label><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setItemForm(undefined)}>Cancel</Button><Button type="submit">Save item</Button></div></form></Modal>}

    {removing && <Modal title={`Delete ${removing.name}?`} onClose={() => setRemoving(undefined)}><div className="confirm-reset"><p>This removes the {removing.kind} from your roadmap. Practice history is not affected.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setRemoving(undefined)}>Cancel</Button><Button variant="danger" icon={<Trash2/>} onClick={remove}>Delete</Button></div></div></Modal>}
  </section>
}
