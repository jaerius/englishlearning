import { addKstDays } from '../common/date.js';
export const INTERVAL_DAYS = [1, 1, 3, 7, 14, 30] as const;
export type NextReview = { nextStage: number; mastered: boolean; nextReviewAt: string };
export function calcNext(input: { stage: number; isCorrect: boolean; hintUsed: boolean; now: Date }): NextReview {
  const stage = Math.max(0, Math.min(5, Math.trunc(input.stage)));
  const nextStage = !input.isCorrect ? Math.max(stage - 2, 0) : input.hintUsed ? stage : Math.min(stage + 1, 5);
  const mastered = input.isCorrect && !input.hintUsed && stage === 5;
  const days = !input.isCorrect ? 1 : mastered ? 60 : INTERVAL_DAYS[nextStage];
  return { nextStage, mastered, nextReviewAt: addKstDays(input.now, days) };
}
