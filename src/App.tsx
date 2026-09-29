import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { AppShell } from './app/AppShell'
import type { Page } from './app/types'
import { db } from './db/database'
import { ExercisesPage } from './pages/ExercisesPage'
import { ProgressPage } from './pages/ProgressPage'
import { SessionsPage } from './pages/SessionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  const [page, setPage] = useState<Page>('today')
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  useEffect(() => {
    if (!settings) return
    const dark = settings.theme === 'dark' || settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [settings])
  const content = { today: <TodayPage/>, sessions: <SessionsPage/>, progress: <ProgressPage/>, exercises: <ExercisesPage/>, settings: <SettingsPage/> }[page]
  return <AppShell page={page} onPage={setPage}>{content}</AppShell>
}
