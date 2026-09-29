export type Page = 'today' | 'sessions' | 'progress' | 'exercises' | 'settings'

const pages = new Set<Page>(['today', 'sessions', 'progress', 'exercises', 'settings'])
export const pageFromHash = (hash: string): Page => {
  const candidate = hash.replace(/^#\/?/, '') as Page
  return pages.has(candidate) ? candidate : 'today'
}
export const hashForPage = (page: Page) => `#/${page}`
