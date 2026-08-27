import { z } from 'zod'
import type { GameLevelId } from '../config/game-levels'

export const playerCheckInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .max(254, 'Email is too long'),
  username: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(24, 'Use 24 characters or fewer')
    .regex(
      /^[\p{L}\p{N}_. -]+$/u,
      'Use letters, numbers, spaces, dots, dashes, or underscores',
    ),
})

export type PlayerCheckIn = z.output<typeof playerCheckInSchema>

export interface CompletedRunCheckIn extends PlayerCheckIn {
  levelId: GameLevelId
  score: number
}

export function logCompletedRunCheckIn(checkIn: CompletedRunCheckIn): void {
  console.info('[Coastal Flight] Player check-in', checkIn)
}
