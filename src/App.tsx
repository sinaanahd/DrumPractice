import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './app/AppShell'
import { hashForPage, pageFromHash, type Page } from './app/types'
import { db } from './db/database'
import { ExercisesPage } from './pages/ExercisesPage'
import { SessionsPage } from './pages/SessionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'

const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })))

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash(window.location.hash))
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const currentSession = useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('dayNumber').reverse().toArray()
    return sessions.find((session) => session.status === 'planned' || session.status === 'active') ?? sessions[0]
  }, [])
  useEffect(() => {
    if (!settings) return
    const dark = settings.theme === 'dark' || settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [settings])
  useEffect(() => {
    const syncPage = () => setPage(pageFromHash(window.location.hash))
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])
  const navigate = (next: Page) => {
    if (next === page) return
    window.location.hash = hashForPage(next)
    setPage(next)
  }
  const content = { today: <TodayPage/>, sessions: <SessionsPage/>, progress: <ProgressPage/>, exercises: <ExercisesPage/>, settings: <SettingsPage/> }[page]
  const contextLabel = `${settings?.currentPhase ?? 'Foundation'} · Day ${currentSession?.dayNumber ?? '—'}`.toUpperCase()
  return <AppShell page={page} onPage={navigate} contextLabel={contextLabel}><Suspense fallback={<div className="loading">Loading progress…</div>}>{content}</Suspense></AppShell>
}
