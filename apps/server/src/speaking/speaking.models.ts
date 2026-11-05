export type SpeakingScenario = {
  id: string;
  title: string;
  description: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  role: string;
  situation: string;
  isCustom: boolean;
};

export type TargetWord = { id: string; word: string; meaningKo: string };
export type Correction = { original: string; corrected: string; explanationKo: string };
export type SpeakingMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  correction: Correction | null;
  usedWords: string[];
  createdAt: string;
};
export type SpeakingSummary = {
  corrections: Correction[];
  expressions: Array<{ phrase: string; meaningKo: string }>;
  targetWords: Array<{ id: string; word: string; used: boolean }>;
  coaching?: { strengthKo: string; focusKo: string; nextPracticeKo: string };
  languageInsights?: Array<{
    original: string;
    naturalAlternative: string;
    spoken: string;
    written: string;
    synonyms: Array<{ expression: string; nuanceKo: string }>;
    explanationKo: string;
  }>;
};
export type SpeakingSession = {
  id: string;
  scenarioId: string;
  cefr: string;
  targetWords: TargetWord[];
  messages: SpeakingMessage[];
  usedWordIds: string[];
  startedAt: string;
  finishedAt: string | null;
  summary: SpeakingSummary | null;
};

export type SpeakingData = {
  speakingScenarios?: SpeakingScenario[];
  speakingSessions?: SpeakingSession[];
};
