import { CalendarDays, ChartNoAxesCombined, Dumbbell, Settings, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Page } from './types'

const items: { id: Page; label: string; icon: typeof Sparkles }[] = [
  { id: 'today', label: 'Today', icon: Sparkles }, { id: 'sessions', label: 'Sessions', icon: CalendarDays }, { id: 'progress', label: 'Progress', icon: ChartNoAxesCombined }, { id: 'exercises', label: 'Exercises', icon: Dumbbell }, { id: 'settings', label: 'Settings', icon: Settings }
]

export function AppShell({ page, onPage, contextLabel, children }: { page: Page; onPage: (page: Page) => void; contextLabel: string; children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => onPage('today')} aria-label="Tempo home"><span className="brand__mark"><i/><i/><i/></span><span><strong>Tempo</strong><small>DRUM TRAINING</small></span></button>
      <nav>{items.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onPage(item.id)}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar__footer"><span className="offline-dot"/> Local & offline<span className="sidebar__version">{contextLabel}</span></div>
    </aside>
    <main className="main">{children}</main>
    <nav className="bottom-nav">{items.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onPage(item.id)}><item.icon size={20}/><span>{item.label}</span></button>)}</nav>
  </div>
}
