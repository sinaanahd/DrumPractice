type SatisfactionArcProps = { value?: number; compact?: boolean }

const colorFor = (value: number) => value >= 75 ? '#3f8b64' : value >= 50 ? '#c3923c' : value >= 25 ? '#d66f35' : '#c5544d'

export function SatisfactionArc({ value = 100, compact = false }: SatisfactionArcProps) {
  const score = Math.max(0, Math.min(100, Math.round(value)))
  const color = colorFor(score)
  return <div className={`satisfaction-arc${compact ? ' satisfaction-arc--compact' : ''}`} title={`Satisfaction: ${score} out of 100`}>
    <svg viewBox="0 0 100 60" aria-hidden="true"><path className="satisfaction-arc__track" d="M 12 50 A 38 38 0 0 1 88 50" pathLength="100"/><path className="satisfaction-arc__value" d="M 12 50 A 38 38 0 0 1 88 50" pathLength="100" style={{ stroke: color, strokeDasharray: `${score} 100` }}/></svg>
    <span style={{ color }}><strong>{score}</strong><small>/100</small></span>{!compact && <em>Satisfaction</em>}
  </div>
}
