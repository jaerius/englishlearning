export type Scenario = {
  id: string;
  title: string;
  description: string;
  level: 1 | 2 | 3 | 4 | 5;
  role: string;
  situation: string;
  isCustom: boolean;
};

export type TargetWord = { id: string; word: string; meaningKo: string };
export type Correction = { original: string; corrected: string; explanationKo: string };
export type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  correction: Correction | null;
  usedWords: string[];
  createdAt: string;
};
export type ConversationSummary = {
  corrections: Correction[];
  expressions: Array<{ phrase: string; meaningKo: string }>;
  targetWords: Array<{ id: string; word: string; used: boolean }>;
};
export type SpeakingSession = {
  id: string;
  scenario: Scenario;
  cefr: string;
  targetWords: TargetWord[];
  messages: Message[];
  usedWordIds: string[];
  startedAt: string;
  finishedAt: string | null;
  summary: ConversationSummary | null;
};
export type StartSessionInput = { scenarioId: string; cefr: string; targetWords?: TargetWord[] };
export type TurnInput = { text: string } | { audio: Uint8Array; mimeType: "audio/mp4" | "audio/webm" };
export type TurnResult = { userText: string; reply: string; usedWords: string[]; hasCorrection: boolean; turnsRemaining: number };
export type RepeatCheckResult = { transcript: string; matchPercent: number; passed: boolean };

export interface SpeakingProvider {
  transcribe(audio: Uint8Array, mimeType: string): Promise<string>;
  reply(input: { prompt: string; messages: Message[]; userText: string; targetWords: TargetWord[] }): Promise<{ reply: string; usedWords: string[]; correction: Correction | null }>;
  summarize(messages: Message[], targetWords: TargetWord[], usedWordIds: string[]): Promise<ConversationSummary>;
  createScenario(text: string, level: number): Promise<Omit<Scenario, "id" | "isCustom">>;
}
