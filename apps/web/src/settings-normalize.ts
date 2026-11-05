export type LearningSettings = {
  level: number; dailyNew: number; reviewCap: number; ttsRate: .8 | 1;
  voiceName: string; sound: boolean; autoplay: boolean; autoSend: boolean; targetWords: boolean;
};

export const defaultLearningSettings: LearningSettings = {
  level: 1, dailyNew: 10, reviewCap: 30, ttsRate: .8, voiceName: '',
  sound: true, autoplay: true, autoSend: true, targetWords: true,
};

function allowedNumber(value: unknown, choices: readonly number[], fallback: number): number {
  return typeof value === 'number' && choices.includes(value) ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSettings(value: unknown): LearningSettings {
  const item = value && typeof value === 'object' ? value as Partial<LearningSettings> : {};
  return {
    level: allowedNumber(item.level, [1, 2, 3, 4, 5, 6], 1),
    dailyNew: allowedNumber(item.dailyNew, [5, 10, 15, 20], 10),
    reviewCap: allowedNumber(item.reviewCap, [20, 30, 50], 30),
    ttsRate: allowedNumber(item.ttsRate, [.8, 1], .8) as .8 | 1,
    voiceName: typeof item.voiceName === 'string' ? item.voiceName : '',
    sound: booleanOr(item.sound, true),
    autoplay: booleanOr(item.autoplay, true),
    autoSend: booleanOr(item.autoSend, true),
    targetWords: booleanOr(item.targetWords, true),
  };
}

export function reviewCount(cap: unknown, count: unknown): number {
  const safeCap = typeof cap === 'number' && Number.isFinite(cap) && cap >= 0 ? cap : 30;
  const safeCount = typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
  return Math.min(safeCap, safeCount);
}
