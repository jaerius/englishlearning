import { WORD_SEEDS } from '@lingo-loop/content/dist/index.js';
import type { Database, Settings, Word } from './models.js';

export const dailyNewCounts = [5, 10, 15, 20];
export const reviewCaps = [20, 30, 50];
const defaultSettings: Settings = {
  dailyNewCount: 10, reviewCap: 30, userLevel: null, soundOn: true, ttsRate: 1,
  ttsAutoplay: true, speakAutoSend: true, useTargetWords: true, dailyAiTurnLimit: 40,
};

export function restoreSettings(saved: Partial<Settings>): Settings {
  const defined = Object.fromEntries(Object.entries(saved).filter(([, value]) => value != null));
  const settings = { ...defaultSettings, ...defined };
  if (!dailyNewCounts.includes(settings.dailyNewCount)) settings.dailyNewCount = defaultSettings.dailyNewCount;
  if (!reviewCaps.includes(settings.reviewCap)) settings.reviewCap = defaultSettings.reviewCap;
  return settings;
}

export function seededWords(): Word[] { return WORD_SEEDS.map(word => ({ ...word })); }
export function emptyDatabase(): Database { return { words: seededWords(), userWords: [], studySessions: [], studyLogs: [], dailyStats: [], settings: { ...defaultSettings } }; }
