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
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
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
        choices: [word.meaningKo, ...distractors.map((item) => item.meaningKo)],
      });
    }
  }
  // Balance the answer positions for every run, so the key cannot cluster in option one.
  const positions = shuffled(Array.from({ length: questions.length }, (_, index) => index % 4), random);
  questions.forEach((question, index) => {
    const distractors = question.choices.slice(1);
    distractors.splice(positions[index]!, 0, question.correctMeaning);
    question.choices = distractors;
  });
  // Start at intermediate level and interleave the remaining levels to avoid a first page of easy items.
  const order = [3, 4, 5, 6, 2, 1] as const;
  return Array.from({ length: 4 }, (_, round) => order.map(level => questions.filter(question => question.level === level)[round]!)).flat();
}

export function calculateLevel(questions: readonly LevelTestQuestion[], answers: ReadonlyMap<string, string | null>): { level: Level; perLevelCorrect: Record<Level, number> } {
  const perLevelCorrect: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const question of questions) if (answers.get(question.id) === question.correctMeaning) perLevelCorrect[question.level] += 1;
  let level: Level = 1;
  for (const candidate of [1, 2, 3, 4, 5, 6] as const) if (perLevelCorrect[candidate] >= 3) level = candidate;
  return { level, perLevelCorrect };
}
