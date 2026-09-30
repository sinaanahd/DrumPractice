export type ExerciseCategory = 'Warm-up' | 'Timing' | 'Technique' | 'Subdivision' | 'Coordination' | 'Rudiment' | 'Transitions' | 'Internal Pulse' | 'Challenge'
export type SkillStatus = 'New' | 'Developing' | 'Comfortable' | 'Solid'
export type ResultState = 'Clean' | 'Good' | 'Some mistakes' | 'Difficult' | 'Failed / retry later'
export type PerformanceLevel = 'Idiot' | 'Beginner' | 'Growing' | 'Skilled' | 'God mode'
export type SessionStatus = 'planned' | 'active' | 'completed' | 'partial'
export type ThemePreference = 'light' | 'dark' | 'system'
export type RoadmapStatus = 'planned' | 'active' | 'developing' | 'comfortable' | 'solid'

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
  performanceLevel?: PerformanceLevel
}

export interface ExerciseResult {
  id: string
  sessionId: string
  sessionExerciseId: string
  exerciseId: string
  state: ResultState
  performanceLevel?: PerformanceLevel
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
  satisfaction?: number
  noMetronomeTestValue?: number
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
  currentFocus: string
  workingBpm: number
  foundationBpm: number
  challengeBpm: number
  configurationSeedVersion: number
}

export interface RoadmapItem {
  id: string
  title: string
  description?: string
  groupId: string
  order: number
  status?: RoadmapStatus
  notes?: string
}

export interface RoadmapGroup {
  id: string
  name: string
  order: number
}

export interface FoundationSkill {
  id: string
  name: string
  description?: string
  level: SkillStatus
  notes?: string
  order: number
}

export interface BackupData {
  version: 2
  exportedAt: string
  exercises: Exercise[]
  sessions: PracticeSession[]
  results: ExerciseResult[]
  settings: Settings
  roadmap: RoadmapItem[]
  roadmapGroups: RoadmapGroup[]
  foundationSkills: FoundationSkill[]
}
