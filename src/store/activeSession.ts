import { useSyncExternalStore } from 'react'

interface ActiveState { sessionId?: string; index: number; timerSeconds: number; timerMode: 'countdown' | 'stopwatch'; timerRunning: boolean }
const key = 'tempo-active-session'
const initial: ActiveState = { index: 0, timerSeconds: 0, timerMode: 'countdown', timerRunning: false }
let state: ActiveState = (() => { try { return { ...initial, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return initial } })()
const listeners = new Set<() => void>()

export const activeSessionStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
  set: (next: Partial<ActiveState>) => { state = { ...state, ...next }; localStorage.setItem(key, JSON.stringify(state)); listeners.forEach((listener) => listener()) },
  reset: () => { state = initial; localStorage.removeItem(key); listeners.forEach((listener) => listener()) }
}

export const useActiveSession = () => useSyncExternalStore(activeSessionStore.subscribe, activeSessionStore.getSnapshot)
