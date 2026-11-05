import { WORD_SEEDS } from '../../../packages/content/src/words';
import type { StudyQuiz, StudyResult, WeeklyStat } from './api';
import type { Word } from './data';

export type LocalProgress = Record<string, { stage: number; wrongCount: number; correctCount: number; nextReviewAt: string; lastStudiedAt: string; mastered: boolean }>;
export type LocalDaily = Record<string, { studiedCount: number; correctCount: number; sessionCount: number }>;
export type LocalSession = { id: string; wordIds: string[]; firstAnswers: Record<string, boolean>; attempts: Record<string, number>; wrongIds: string[] };

export const localWords: Word[] = WORD_SEEDS.map(item => ({
  id: item.id, word: item.word, meaning: item.meaningKo, pos: item.pos,
  example: item.exampleEn, translation: item.exampleKo, level: item.level, stage: 0, wrong: 0,
  spokenExampleEn: item.spokenExampleEn, writtenExampleEn: item.writtenExampleEn, usageNoteKo: item.usageNoteKo,
  domain: item.domain, synonyms: item.synonyms, etymology: item.etymology,
}));

export function kstDay(date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectNewWords(progress: LocalProgress, level: number, count: number): Word[] {
  return localWords.filter(word => !progress[word.id])
    .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level)
    .slice(0, count);
}

export function localQuiz(word: Word, stage: number): StudyQuiz {
  const peers = shuffle(localWords.filter(item => item.id !== word.id && item.level === word.level));
  if (stage <= 1) return { wordId: word.id, type: 'A', prompt: word.word, translation: word.translation,
    options: shuffle([word.meaning, ...peers.slice(0, 3).map(item => item.meaning)]), answer: word.meaning, stage };
  if (stage <= 3) {
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { wordId: word.id, type: 'B', prompt: word.example.replace(new RegExp(escaped, 'i'), '____'),
      translation: word.translation, options: shuffle([word.word, ...peers.slice(0, 3).map(item => item.word)]), answer: word.word, stage };
  }
  return { wordId: word.id, type: 'C', prompt: `${word.meaning} · ${word.pos}`, translation: word.translation, options: [], answer: word.word, stage };
}

export function nextProgress(previous: LocalProgress[string] | undefined, correct: boolean, hintUsed: boolean, now = new Date()): LocalProgress[string] {
  const stage = previous?.stage ?? 0;
  const nextStage = correct ? (hintUsed ? stage : Math.min(5, stage + 1)) : Math.max(0, stage - 2);
  const mastered = correct && !hintUsed && stage === 5;
  const interval = correct ? (mastered ? 60 : [1, 1, 3, 7, 14, 30][nextStage]) : 1;
  return { stage: nextStage, wrongCount: (previous?.wrongCount ?? 0) + Number(!correct),
    correctCount: (previous?.correctCount ?? 0) + Number(correct), nextReviewAt: addDays(kstDay(now), interval),
    lastStudiedAt: now.toISOString(), mastered };
}

export function localMetrics(progress: LocalProgress, daily: LocalDaily, now = new Date()) {
  const today = kstDay(now);
  const weekly: WeeklyStat[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return { date, studiedCount: daily[date]?.studiedCount ?? 0, correctCount: daily[date]?.correctCount ?? 0 };
  });
  const studied = weekly.reduce((total, item) => total + item.studiedCount, 0);
  const correct = weekly.reduce((total, item) => total + item.correctCount, 0);
  let cursor = daily[today]?.studiedCount ? today : addDays(today, -1);
  let streak = 0;
  while ((daily[cursor]?.studiedCount ?? 0) > 0) { streak++; cursor = addDays(cursor, -1); }
  return {
    streak, studied: daily[today]?.studiedCount ?? 0,
    dueCount: Object.values(progress).filter(item => item.nextReviewAt <= today).length,
    weeklyAccuracy: studied ? Math.round(correct / studied * 100) : 0,
    weekly,
    wrongIds: Object.entries(progress).filter(([, item]) => item.wrongCount > 0 && item.stage < 4).map(([id]) => id),
    masteredCount: Object.values(progress).filter(item => item.stage >= 4).length,
  };
}

export function localResult(session: LocalSession): StudyResult {
  const correctCount = Object.values(session.firstAnswers).filter(Boolean).length;
  const totalCount = session.wordIds.length;
  return { sessionId: session.id, totalCount, correctCount,
    accuracy: totalCount ? Math.round(correctCount / totalCount * 100) : 0,
    wrongWords: session.wrongIds.flatMap(id => {
      const word = localWords.find(item => item.id === id);
      return word ? [{ id, word: word.word, meaningKo: word.meaning }] : [];
    }) };
}
