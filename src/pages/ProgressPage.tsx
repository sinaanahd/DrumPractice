import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, CalendarCheck, Clock3, Gauge, TrendingDown } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/database'
import { practiceMetrics } from '../utils/calculations'

export function ProgressPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').toArray(), []) ?? []
  const results = useLiveQuery(() => db.results.orderBy('completedAt').toArray(), []) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const roadmap = useLiveQuery(() => db.roadmap.toArray(), []) ?? []
  const metrics = practiceMetrics(sessions)
  const timing = results.filter((r) => r.targetBpm != null && r.measuredBpm != null).map((result, index) => ({ name: `Test ${index+1}`, target: result.targetBpm, result: result.measuredBpm, deviation: Math.abs(result.measuredBpm! - result.targetBpm!) }))
  const tempos = sessions.filter((s) => s.status === 'completed' || s.status === 'partial').map((session) => { const values = results.filter((r)=>r.sessionId===session.id && r.bpmUsed).map((r)=>r.bpmUsed!); return { name: `Day ${session.dayNumber}`, bpm: values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : undefined } }).filter((x)=>x.bpm)
  const skillNames = ['quarters-60','eighths-leads','quarter-eighth','singles-doubles','rest-return','sixteenth-bursts','foot-coordination']
  return <>
    <PageHeader eyebrow="STEADY, NOT RUSHED" title="Progress" subtitle="Look for better control, consistency, and timing—not just more speed."/>
    <div className="metric-grid"><Metric icon={<CalendarCheck/>} label="Total sessions" value={String(metrics.totalSessions)}/><Metric icon={<Activity/>} label="This week" value={String(metrics.sessionsThisWeek)}/><Metric icon={<Clock3/>} label="Practice time" value={metrics.totalMinutes ? `${Math.floor(metrics.totalMinutes/60)}h ${metrics.totalMinutes%60}m` : '0 min'}/><Metric icon={<Gauge/>} label="Average session" value={`${metrics.averageMinutes} min`}/></div>
    <div className="progress-grid">
      <section className="panel chart-panel"><div className="panel__header"><div><span className="eyebrow">INTERNAL TIMING</span><h2>Deviation from target</h2><p>Closer to zero means the pulse is becoming more accurate.</p></div><TrendingDown/></div>{timing.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={timing}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis unit=" bpm" allowDecimals={false}/><Tooltip/><Line dataKey="deviation" stroke="var(--accent)" strokeWidth={3} dot={{r:5}}/></LineChart></ResponsiveContainer></div> : <div className="chart-empty"><span>±</span><strong>Your first timing test will appear here</strong><p>Record a measured BPM during the Internal timing test.</p></div>}</section>
      <section className="panel chart-panel"><div className="panel__header"><div><span className="eyebrow">WORKING TEMPO</span><h2>Tempo context</h2><p>A record of where control felt sustainable.</p></div></div>{tempos.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={tempos}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis domain={[45,75]}/><Tooltip/><Line dataKey="bpm" stroke="var(--gold)" strokeWidth={3}/></LineChart></ResponsiveContainer></div> : <div className="tempo-context"><div><span>60</span><small>FOUNDATION</small></div><div className="tempo-line"><i/><i className="current"/><i/></div><div><span>65</span><small>WORKING</small></div><div><span>70</span><small>CHALLENGE</small></div><p>Complete sessions to see your practiced tempos over time.</p></div>}</section>
      <section className="panel skills-panel"><div className="panel__header"><div><span className="eyebrow">SKILL PROGRESS</span><h2>Foundation skills</h2></div></div>{skillNames.map((id) => { const exercise = exercises.find((e)=>e.id===id); const levels = ['New','Developing','Comfortable','Solid']; const active = levels.indexOf(exercise?.status ?? 'New'); return <div className="skill-row" key={id}><div><strong>{exercise?.name}</strong><span>{exercise?.category}</span></div><div className="skill-track">{levels.map((level,index)=><i key={level} className={index<=active?'filled':''}/>)}</div><span className={`status-tag status-tag--${exercise?.status.toLowerCase()}`}>{exercise?.status}</span></div>})}</section>
      <section className="panel roadmap-panel"><div className="panel__header"><div><span className="eyebrow">TRAINING ROADMAP</span><h2>One variable at a time</h2></div></div>{(['current','upcoming','later'] as const).map((phase) => <div className="roadmap-group" key={phase}><span>{phase === 'current' ? 'NOW · FOUNDATION' : phase.toUpperCase()}</span><div>{roadmap.filter((item)=>item.phase===phase).map((item)=><span className={item.complete?'complete':''} key={item.id}>{item.name}</span>)}</div></div>)}</section>
    </div>
  </>
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="metric-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div> }
