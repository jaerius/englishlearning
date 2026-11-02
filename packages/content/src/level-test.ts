import type { Level, LevelTestQuestion, WordSeed } from "./types.js";

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

export function generateLevelTest(words: readonly WordSeed[], random: () => number = Math.random): LevelTestQuestion[] {
  const questions: LevelTestQuestion[] = [];
  for (const level of [1, 2, 3, 4, 5] as const) {
    const pool = words.filter((word) => word.level === level);
    if (pool.length < 7) throw new RangeError(`Level ${level} needs at least 7 words`);
    const selected = shuffled(pool, random).slice(0, 4);
    for (const word of selected) {
      const distractors = shuffled(pool.filter((candidate) => candidate.id !== word.id && candidate.meaningKo !== word.meaningKo), random).slice(0, 3);
      questions.push({
        id: `level-test-${word.id}`,
        level: level as Level,
        wordId: word.id,
        word: word.word,
        correctMeaning: word.meaningKo,
        choices: shuffled([word.meaningKo, ...distractors.map((item) => item.meaningKo)], random),
      });
    }
  }
  return questions;
}

export function calculateLevel(questions: readonly LevelTestQuestion[], answers: ReadonlyMap<string, string | null>): { level: Level; perLevelCorrect: Record<Level, number> } {
  const perLevelCorrect: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const question of questions) if (answers.get(question.id) === question.correctMeaning) perLevelCorrect[question.level] += 1;
  let level: Level = 1;
  for (const candidate of [1, 2, 3, 4, 5] as const) if (perLevelCorrect[candidate] >= 3) level = candidate;
  return { level, perLevelCorrect };
}
