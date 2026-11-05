export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type PartOfSpeech = "adjective" | "adverb" | "noun" | "verb" | "phrase";

export interface WordSeed {
  id: string;
  word: string;
  pos: PartOfSpeech;
  level: Level;
  cefr: Cefr;
  meaningKo: string;
  exampleEn: string;
  exampleKo: string;
  hasExample: true;
  isPhrase: boolean;
  spokenExampleEn?: string;
  writtenExampleEn?: string;
  usageNoteKo?: string;
  domain?: "general" | "business";
  synonyms?: Array<{ word: string; nuanceKo: string }>;
  etymology?: { summaryKo: string; sourceUrl: string };
}

export interface LevelTestQuestion {
  id: string;
  level: Level;
  wordId: string;
  word: string;
  correctMeaning: string;
  choices: string[];
}
