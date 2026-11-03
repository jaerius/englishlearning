import assert from 'node:assert/strict';
import test from 'node:test';
import { kstDay, localMetrics, localQuiz, localResult, localWords, nextProgress, selectNewWords } from '../src/local-learning.ts';
import { localLevelQuestions, localLevelScores } from '../src/level-fallback.ts';
import { WORD_SEEDS } from '../../../packages/content/src/words.ts';
import { parseLocalBackup } from '../src/local-backup.ts';

test('local placement covers A1-C2 with balanced answer positions and truthful scoring', () => {
  const questions = localLevelQuestions();
  assert.equal(questions.length, 24);
  assert.deepEqual(questions.slice(0, 6).map(question => question.level), [3, 4, 5, 6, 2, 1]);
  const answerIndexes = questions.map(question => question.options.indexOf(WORD_SEEDS.find(word => word.id === question.wordId).meaningKo));
  assert.deepEqual([0, 1, 2, 3].map(index => answerIndexes.filter(answer => answer === index).length), [6, 6, 6, 6]);
  assert.deepEqual(localLevelScores(questions, questions.map(question => WORD_SEEDS.find(word => word.id === question.wordId).meaningKo)), [4, 4, 4, 4, 4, 4]);
});

test('local backup accepts valid learning records and rejects unknown words', () => {
  const valid = { format: 'lingo-loop-local-v1', exportedAt: '2026-11-04T00:00:00Z', localProgress: {
    'l1-arrive': { stage: 1, wrongCount: 0, correctCount: 1, nextReviewAt: '2026-11-05', lastStudiedAt: '2026-11-04T00:00:00Z', mastered: false },
  }, localDaily: { '2026-11-04': { studiedCount: 1, correctCount: 1, sessionCount: 1 } } };
  assert.deepEqual(parseLocalBackup(JSON.stringify(valid)).localProgress, valid.localProgress);
  assert.throws(() => parseLocalBackup(JSON.stringify({ ...valid, localProgress: { unknown: valid.localProgress['l1-arrive'] } })), /단어 기록/);
});

test('a new learner has no fabricated activity, reviews, or wrong notes', () => {
  const metrics = localMetrics({}, {}, new Date('2026-11-03T05:00:00Z'));
  assert.equal(metrics.streak, 0);
  assert.equal(metrics.studied, 0);
  assert.equal(metrics.dueCount, 0);
  assert.equal(metrics.weeklyAccuracy, 0);
  assert.deepEqual(metrics.wrongIds, []);
  assert.equal(metrics.weekly.length, 7);
});

test('local SRS and metrics use the Seoul calendar, first-answer count, and actual study days', () => {
  const now = new Date('2026-11-02T15:10:00Z');
  assert.equal(kstDay(now), '2026-11-03');
  const wrong = nextProgress(undefined, false, false, now);
  assert.equal(wrong.wrongCount, 1);
  assert.equal(wrong.nextReviewAt, '2026-11-04');
  const metrics = localMetrics({ 'l1-arrive': wrong }, {
    '2026-11-02': { studiedCount: 3, correctCount: 2, sessionCount: 1 },
    '2026-11-03': { studiedCount: 2, correctCount: 1, sessionCount: 1 },
  }, now);
  assert.equal(metrics.streak, 2);
  assert.equal(metrics.studied, 2);
  assert.equal(metrics.weeklyAccuracy, 60);
  assert.deepEqual(metrics.wrongIds, ['l1-arrive']);
  assert.equal(metrics.dueCount, 0);
});

test('local quiz offers distinct choices and result counts only first answers', () => {
  const word = localWords.find(item => item.id === 'l1-arrive');
  assert.ok(word);
  const quiz = localQuiz(word, 0);
  assert.equal(quiz.options.length, 4);
  assert.equal(new Set(quiz.options).size, 4);
  assert.equal(quiz.options.filter(item => item === quiz.answer).length, 1);
  const result = localResult({ id: 'local-test', wordIds: ['l1-arrive', 'l1-borrow'],
    firstAnswers: { 'l1-arrive': false, 'l1-borrow': true }, attempts: { 'l1-arrive': 2, 'l1-borrow': 1 }, wrongIds: ['l1-arrive'] });
  assert.equal(result.totalCount, 2);
  assert.equal(result.correctCount, 1);
  assert.equal(result.accuracy, 50);
  assert.deepEqual(result.wrongWords.map(item => item.id), ['l1-arrive']);
});

test('mastered count follows stage four and high-level learners can continue with remaining words', () => {
  const progress = Object.fromEntries(localWords.filter(word => word.level === 6).map(word =>
    [word.id, { stage: 4, wrongCount: 0, correctCount: 4, nextReviewAt: '2026-12-01', lastStudiedAt: '2026-11-03T00:00:00Z', mastered: false }]));
  const metrics = localMetrics(progress, {}, new Date('2026-11-03T05:00:00Z'));
  assert.equal(metrics.masteredCount, Object.keys(progress).length);
  const next = selectNewWords(progress, 6, 10);
  assert.equal(next.length, 10);
  assert.ok(next.every(word => word.level < 6));
  assert.ok(localWords.some(word => word.spokenExampleEn && word.writtenExampleEn && word.usageNoteKo));
});
