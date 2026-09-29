import { Minus, Plus, Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { useMetronome } from '../hooks/useMetronome'
import { Button } from './Button'

export function Metronome({ prescribedBpm, defaultVolume = 0.55, compact = false }: { prescribedBpm?: number; defaultVolume?: number; compact?: boolean }) {
  const metronome = useMetronome(prescribedBpm ?? 65, defaultVolume)
  useEffect(() => { if (prescribedBpm) metronome.setBpm(prescribedBpm) }, [prescribedBpm]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`metronome ${compact ? 'metronome--compact' : ''}`}>
    <div className="metronome__top"><span className="eyebrow">METRONOME · 4/4</span><div className="beat-dots">{[0,1,2,3].map((dot) => <span key={dot} className={metronome.playing && metronome.beat === dot ? 'active' : ''} />)}</div></div>
    <div className="tempo-control"><Button variant="ghost" aria-label="Decrease BPM" onClick={() => metronome.setBpm(Math.max(30, metronome.bpm - 1))} icon={<Minus />} /><div><strong>{metronome.bpm}</strong><span>BPM</span></div><Button variant="ghost" aria-label="Increase BPM" onClick={() => metronome.setBpm(Math.min(240, metronome.bpm + 1))} icon={<Plus />} /></div>
    <div className="metronome__actions"><Button onClick={() => metronome.setPlaying(!metronome.playing)}>{metronome.playing ? 'Stop click' : 'Start click'}</Button><Button variant="secondary" onClick={metronome.tap}>Tap tempo</Button></div>
    {!compact && <label className="volume"><Volume2 size={16}/><input type="range" min="0" max="1" step="0.05" value={metronome.volume} onChange={(event) => metronome.setVolume(Number(event.target.value))}/></label>}
  </div>
}
