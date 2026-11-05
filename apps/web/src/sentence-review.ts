import { WORD_SEEDS } from '../../../packages/content/src/words';

export type SentenceProgress = {
  step: number;
  nextReviewOn: string;
  lastReviewedAt: string;
  attempts: number;
  recalled: number;
};
export type SentenceReviewState = Record<string, SentenceProgress>;
export type SentenceItem = (typeof WORD_SEEDS)[number];

const intervals = [1, 3, 7, 14, 30, 60] as const;
const storageKey = 'lingo-loop-sentence-review-v1';
const knownIds = new Set(WORD_SEEDS.map(word => word.id));

export function seoulDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function sentenceQueue(progress: SentenceReviewState, level: number, now = new Date(), limit = 8): SentenceItem[] {
  const today = seoulDay(now);
  const due = WORD_SEEDS.filter(word => progress[word.id]?.nextReviewOn <= today)
    .sort((a, b) => progress[a.id]!.nextReviewOn.localeCompare(progress[b.id]!.nextReviewOn));
  const unseen = WORD_SEEDS.filter(word => !progress[word.id])
    .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level);
  return [...due, ...unseen].slice(0, Math.max(0, limit));
}

export function dueSentenceCount(progress: SentenceReviewState, now = new Date()): number {
  const today = seoulDay(now);
  return Object.values(progress).filter(item => item.nextReviewOn <= today).length;
}

export function gradeSentence(previous: SentenceProgress | undefined, remembered: boolean, now = new Date()): SentenceProgress {
  const step = remembered ? Math.min(5, (previous?.step ?? -1) + 1) : 0;
  return {
    step,
    nextReviewOn: addDays(seoulDay(now), remembered ? intervals[step] : 1),
    lastReviewedAt: now.toISOString(),
    attempts: (previous?.attempts ?? 0) + 1,
    recalled: (previous?.recalled ?? 0) + Number(remembered),
  };
}

export function parseSentenceState(raw: string | null): SentenceReviewState {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const valid: SentenceReviewState = {};
    for (const [id, item] of Object.entries(value)) {
      if (!knownIds.has(id) || !item || typeof item !== 'object') continue;
      const candidate = item as Partial<SentenceProgress>;
      if (!Number.isInteger(candidate.step) || (candidate.step ?? -1) < 0 || (candidate.step ?? 6) > 5 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(candidate.nextReviewOn ?? '') ||
          !Number.isInteger(candidate.attempts) || (candidate.attempts ?? -1) < 0 ||
          !Number.isInteger(candidate.recalled) || (candidate.recalled ?? -1) < 0 ||
          (candidate.recalled ?? 0) > (candidate.attempts ?? 0)) continue;
      valid[id] = candidate as SentenceProgress;
    }
    return valid;
  } catch { return {}; }
}

export function loadSentenceState(): SentenceReviewState {
  try { return parseSentenceState(window.localStorage.getItem(storageKey)); } catch { return {}; }
}

export function saveSentenceState(progress: SentenceReviewState): void {
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}
