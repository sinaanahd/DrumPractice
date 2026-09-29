export function reorder<T extends { id: string; order: number }>(items: T[], id: string, delta: number): T[] {
  const sorted = [...items].sort((left, right) => left.order - right.order)
  const index = sorted.findIndex((item) => item.id === id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= sorted.length) return sorted
  ;[sorted[index], sorted[target]] = [sorted[target], sorted[index]]
  return sorted.map((item, order) => ({ ...item, order }))
}

export function removeAndReorder<T extends { id: string; order: number }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id).sort((left, right) => left.order - right.order).map((item, order) => ({ ...item, order }))
}
