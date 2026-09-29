import { useCallback, useEffect, useRef, useState } from 'react'

export function useMetronome(initialBpm = 65, initialVolume = 0.55) {
  const [bpm, setBpm] = useState(initialBpm)
  const [volume, setVolume] = useState(initialVolume)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const audioRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const nextNoteRef = useRef(0)
  const beatRef = useRef(0)
  const tapsRef = useRef<number[]>([])

  const schedule = useCallback((context: AudioContext) => {
    while (nextNoteRef.current < context.currentTime + 0.1) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = beatRef.current === 0 ? 1100 : 760
      gain.gain.setValueAtTime(0.0001, nextNoteRef.current)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.3), nextNoteRef.current + 0.002)
      gain.gain.exponentialRampToValueAtTime(0.0001, nextNoteRef.current + 0.045)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(nextNoteRef.current); oscillator.stop(nextNoteRef.current + 0.05)
      const currentBeat = beatRef.current
      window.setTimeout(() => setBeat(currentBeat), Math.max(0, (nextNoteRef.current - context.currentTime) * 1000))
      beatRef.current = (beatRef.current + 1) % 4
      nextNoteRef.current += 60 / bpm
    }
  }, [bpm, volume])

  useEffect(() => {
    if (!playing) return
    const context = audioRef.current ?? new AudioContext()
    audioRef.current = context
    void context.resume()
    nextNoteRef.current = context.currentTime + 0.06
    beatRef.current = 0
    timerRef.current = window.setInterval(() => schedule(context), 25)
    return () => window.clearInterval(timerRef.current)
  }, [playing, schedule])

  useEffect(() => () => { if (audioRef.current) void audioRef.current.close() }, [])

  const tap = () => {
    const now = performance.now(); const recent = [...tapsRef.current, now].slice(-5); tapsRef.current = recent
    if (recent.length > 1) {
      const gaps = recent.slice(1).map((value, index) => value - recent[index])
      setBpm(Math.max(30, Math.min(240, Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)))))
    }
  }
  return { bpm, setBpm, volume, setVolume, playing, setPlaying, beat, tap }
}
