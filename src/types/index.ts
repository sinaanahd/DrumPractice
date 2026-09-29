export type ExerciseCategory = 'Warm-up' | 'Timing' | 'Technique' | 'Subdivision' | 'Coordination' | 'Rudiment' | 'Transitions' | 'Internal Pulse' | 'Challenge'
export type SkillStatus = 'New' | 'Developing' | 'Comfortable' | 'Solid'
export type ResultState = 'Clean' | 'Good' | 'Some mistakes' | 'Difficult' | 'Failed / retry later'
export type SessionStatus = 'planned' | 'active' | 'completed' | 'partial'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  description: string
  instructions: string[]
  purpose: string
  bpm?: number
  bpmRange?: [number, number]
  durationSeconds?: number
  repetitions?: number
  pattern?: string
  difficulty: 'Foundation' | 'Exploratory' | 'Challenge'
  status: SkillStatus
  optional: boolean
  notes?: string
  custom?: boolean
}

export interface SessionExercise {
  id: string
  exerciseId: string
  order: number
  bpm?: number
  durationSeconds?: number
  repetitions?: number
  optional: boolean
}

export interface ExerciseResult {
  id: string
  sessionId: string
  sessionExerciseId: string
  exerciseId: string
  state: ResultState
  bpmUsed?: number
  mistakeCount?: number
  comfort?: number
  note?: string
  timingNote?: string
  targetBpm?: number
  measuredBpm?: number
  completedAt: string
  skipped?: boolean
}

export interface PracticeSession {
  id: string
  dayNumber: number
  date: string
  phase: string
  plannedDuration: number
  actualDuration?: number
  status: SessionStatus
  exercises: SessionExercise[]
  energy?: number
  notes?: string
  startedAt?: string
  completedAt?: string
}

export interface Settings {
  id: 'settings'
  theme: ThemePreference
  defaultSessionDuration: number
  metronomeVolume: number
  countIn: boolean
  currentPhase: string
  workingBpm: number
  foundationBpm: number
  challengeBpm: number
}

export interface RoadmapItem {
  id: string
  name: string
  phase: 'current' | 'upcoming' | 'later'
  complete: boolean
}

export interface BackupData {
  version: number
  exportedAt: string
  exercises: Exercise[]
  sessions: PracticeSession[]
  results: ExerciseResult[]
  settings: Settings
  roadmap: RoadmapItem[]
}
