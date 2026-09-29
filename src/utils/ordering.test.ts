import { describe, expect, it } from 'vitest'
import { removeAndReorder, reorder } from './ordering'

const items = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }, { id: 'c', order: 2 }]

describe('ordered configuration collections', () => {
  it('reorders an item and normalizes every position', () => {
    expect(reorder(items, 'b', -1)).toEqual([{ id: 'b', order: 0 }, { id: 'a', order: 1 }, { id: 'c', order: 2 }])
  })

  it('removes an item without leaving order gaps', () => {
    expect(removeAndReorder(items, 'b')).toEqual([{ id: 'a', order: 0 }, { id: 'c', order: 1 }])
  })
})
