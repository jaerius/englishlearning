import { WORD_SEEDS } from '@lingo-loop/content/dist/index.js';
import type { Database, Word } from './models.js';

export function seededWords(): Word[] { return WORD_SEEDS.map(word => ({ ...word })); }
export function emptyDatabase(): Database { return { words: seededWords(), userWords: [], studySessions: [], studyLogs: [], dailyStats: [], settings: { dailyNewCount: 10, reviewCap: 30, userLevel: null, soundOn: true, ttsRate: 1, ttsAutoplay: true, speakAutoSend: true, useTargetWords: true, dailyAiTurnLimit: 40 } }; }
