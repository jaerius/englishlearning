import assert from "node:assert/strict";
import test from "node:test";
import { calculateLevel, generateLevelTest, validateLevelTest, validateWords, WORD_SEEDS } from "../dist/index.js";

const deterministicRandom = () => {
  let state = 123456789;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
};

test("all original seed words satisfy content policy", () => {
  assert.equal(WORD_SEEDS.length, 126);
  assert.deepEqual(validateWords(WORD_SEEDS), []);
  assert.equal(WORD_SEEDS.filter(word => word.cefr === "C2").length, 18);
  assert.equal(WORD_SEEDS.filter(word => word.spokenExampleEn && word.writtenExampleEn).length, 54);
});

test("level test contains four valid questions per level", () => {
  const questions = generateLevelTest(WORD_SEEDS, deterministicRandom());
  assert.deepEqual(validateLevelTest(questions), []);
  assert.equal(new Set(questions.map((question) => question.wordId)).size, 24);
  assert.equal(questions[0].level, 3);
  assert.deepEqual(questions.reduce((counts, question) => {
    counts[question.choices.indexOf(question.correctMeaning)] += 1;
    return counts;
  }, [0, 0, 0, 0]), [6, 6, 6, 6]);
});

test("level calculation selects the highest level with three correct answers", () => {
  const questions = generateLevelTest(WORD_SEEDS, deterministicRandom());
  const answers = new Map();
  for (const question of questions) {
    const correct = question.level <= 3 && questions.filter((item) => item.level === question.level).indexOf(question) < 3;
    answers.set(question.id, correct ? question.correctMeaning : null);
  }
  const result = calculateLevel(questions, answers);
  assert.equal(result.level, 3);
  assert.deepEqual(result.perLevelCorrect, { 1: 3, 2: 3, 3: 3, 4: 0, 5: 0, 6: 0 });
});

test("all levels below threshold fall back to level one", () => {
  const questions = generateLevelTest(WORD_SEEDS, deterministicRandom());
  assert.equal(calculateLevel(questions, new Map()).level, 1);
});
