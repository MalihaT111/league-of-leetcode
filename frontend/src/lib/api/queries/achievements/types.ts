export type Difficulty = "easy" | "medium" | "hard" | string;

export interface Achievement {
  id: number;
  description: string;
  target: number;
  difficulty: Difficulty;
  event: string;
  unlocked: boolean;
}

export interface AchievementCheckResult {
  message: string;
  newly_unlocked: Achievement[];
}

export interface UserAchievementsResponse {
  achievements: Achievement[];
  total_unlocked: number;
}