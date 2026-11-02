import type { LevelTestQuestion, WordSeed } from "./types.js";

const normalized = (value: string): string => value.toLocaleLowerCase("en-US").replace(/[.,!?;:'“”]/g, "").trim();
const wordCount = (value: string): number => normalized(value).split(/\s+/).filter(Boolean).length;

export function validateWords(words: readonly WordSeed[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const lexicalKeys = new Set<string>();
  for (const word of words) {
    if (ids.has(word.id)) errors.push(`${word.id}: duplicate id`);
    ids.add(word.id);
    const lexicalKey = `${normalized(word.word)}:${word.pos}`;
    if (lexicalKeys.has(lexicalKey)) errors.push(`${word.id}: duplicate word and part of speech`);
    lexicalKeys.add(lexicalKey);
    const count = wordCount(word.exampleEn);
    if (count < 6 || count > 16) errors.push(`${word.id}: example must contain 6-16 words, received ${count}`);
    if (!normalized(word.exampleEn).includes(normalized(word.word))) errors.push(`${word.id}: example does not contain the word or phrase`);
    if (!word.meaningKo.trim() || !word.exampleKo.trim()) errors.push(`${word.id}: Korean fields are required`);
    if (!word.hasExample) errors.push(`${word.id}: exposed seed must have an example`);
  }
  for (const level of [1, 2, 3, 4, 5] as const) {
    const count = words.filter((word) => word.level === level).length;
    if (count < 12) errors.push(`level ${level}: expected at least 12 words, received ${count}`);
  }
  return errors;
}

export function validateLevelTest(questions: readonly LevelTestQuestion[]): string[] {
  const errors: string[] = [];
  if (questions.length !== 20) errors.push(`expected 20 questions, received ${questions.length}`);
  for (const level of [1, 2, 3, 4, 5] as const) {
    const count = questions.filter((question) => question.level === level).length;
    if (count !== 4) errors.push(`level ${level}: expected 4 questions, received ${count}`);
  }
  for (const question of questions) {
    if (question.choices.length !== 4 || new Set(question.choices).size !== 4) errors.push(`${question.id}: choices must be four unique meanings`);
    if (!question.choices.includes(question.correctMeaning)) errors.push(`${question.id}: correct meaning missing from choices`);
  }
  return errors;
}
