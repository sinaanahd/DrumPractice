import { Crown, Flame, Frown, Sprout, Trophy, type LucideIcon } from 'lucide-react'
import type { PerformanceLevel, ResultState } from '../types'

type LevelConfig = { level: PerformanceLevel; Icon: LucideIcon }

export const performanceLevels: LevelConfig[] = [
  { level: 'Idiot', Icon: Frown },
  { level: 'Beginner', Icon: Sprout },
  { level: 'Growing', Icon: Flame },
  { level: 'Skilled', Icon: Trophy },
  { level: 'God mode', Icon: Crown }
]

const levelsByResultState: Record<ResultState, PerformanceLevel> = {
  'Failed / retry later': 'Idiot', Difficult: 'Beginner', 'Some mistakes': 'Growing', Good: 'Skilled', Clean: 'God mode'
}

export const levelFromResultState = (state: ResultState): PerformanceLevel => levelsByResultState[state]

export function ExerciseLevelBadge({ level }: { level?: PerformanceLevel }) {
  const item = performanceLevels.find((entry) => entry.level === level) ?? performanceLevels[3]
  const Icon = item.Icon
  return <span className={`exercise-level exercise-level--${item.level.toLowerCase().replaceAll(' ', '-')}`}><Icon aria-hidden="true"/>{item.level}</span>
}
