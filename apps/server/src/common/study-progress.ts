import type { UserWord } from './models.js';

export function isReviewDue(progress: UserWord, date: string): boolean {
  return progress.status !== 'new' && progress.nextReviewAt <= date;
}
