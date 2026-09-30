import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, CalendarCheck, Clock3, Gauge, TrendingDown } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/database'
import { FoundationSkillsManager } from '../features/configuration/FoundationSkillsManager'
import { RoadmapManager } from '../features/configuration/RoadmapManager'
import { TrainingContextCard } from '../features/configuration/TrainingContextCard'
import { noMetronomeTestResult, practiceMetrics } from '../utils/calculations'

export function ProgressPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').toArray(), []) ?? []
  const results = useLiveQuery(() => db.results.orderBy('completedAt').toArray(), []) ?? []
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const metrics = practiceMetrics(sessions)
  const timing = sessions.flatMap((session) => {
    const test = noMetronomeTestResult(session, results)
    return test == null ? [] : [{ name: `Day ${session.dayNumber}`, value: test }]
  })
  const tempos = sessions.filter((s) => s.status === 'completed' || s.status === 'partial').map((session) => { const values = results.filter((r)=>r.sessionId===session.id && r.bpmUsed).map((r)=>r.bpmUsed!); return { name: `Day ${session.dayNumber}`, bpm: values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : undefined } }).filter((x)=>x.bpm)
  if (!settings) return <div className="loading">Loading progress…</div>
  return <>
    <PageHeader eyebrow="STEADY, NOT RUSHED" title="Progress" subtitle="Look for better control, consistency, and timing—not just more speed."/>
    <TrainingContextCard settings={settings} progress/>
    <div className="metric-grid"><Metric icon={<CalendarCheck/>} label="Total sessions" value={String(metrics.totalSessions)}/><Metric icon={<Activity/>} label="This week" value={String(metrics.sessionsThisWeek)}/><Metric icon={<Clock3/>} label="Practice time" value={metrics.totalMinutes ? `${Math.floor(metrics.totalMinutes/60)}h ${metrics.totalMinutes%60}m` : '0 min'}/><Metric icon={<Gauge/>} label="Average session" value={`${metrics.averageMinutes} min`}/></div>
    <div className="progress-grid">
      <section className="panel chart-panel"><div className="panel__header"><div><span className="eyebrow">DEFINING STAGE · INTERNAL TIMING</span><h2>No-metronome test</h2><p>Track the test value recorded for each session.</p></div><TrendingDown/></div>{timing.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={timing}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Line dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{r:5}}/></LineChart></ResponsiveContainer></div> : <div className="chart-empty"><span>♩</span><strong>Your first no-metronome test will appear here</strong><p>Enter a no-metronome test value in a session to start tracking this defining stage.</p></div>}</section>
      <section className="panel chart-panel"><div className="panel__header"><div><span className="eyebrow">HISTORICAL PRACTICE DATA</span><h2>Practiced tempo</h2><p>Recorded session BPMs stay unchanged when you edit the current context.</p></div></div>{tempos.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={tempos}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line dataKey="bpm" stroke="var(--gold)" strokeWidth={3}/></LineChart></ResponsiveContainer></div> : <div className="chart-empty"><span>♩</span><strong>Your practiced tempos will appear here</strong><p>Complete sessions to build a historical record.</p></div>}</section>
      <FoundationSkillsManager/>
      <RoadmapManager/>
    </div>
  </>
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="metric-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div> }
