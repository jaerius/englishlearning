import test from 'node:test';
import assert from 'node:assert/strict';
import type { Database } from '../common/models.js';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import { StudyService } from './study.service.js';
import { StatsService } from '../stats/stats.service.js';

function fixture(): { db: Database; service: StudyService } {
  const db = emptyDatabase();
  db.userWords.push({ id: 'progress-1', wordId: 'l1-arrive', stage: 2, nextReviewAt: '2026-01-01', correctCount: 0, wrongCount: 0, status: 'learning', flaggedUnknown: false, spokenCount: 0, lastSpokenAt: null, lastStudiedAt: null });
  db.studySessions.push({ id: 'session-1', kind: 'review', startedAt: new Date().toISOString(), finishedAt: null, wordIds: ['l1-arrive'], totalCount: 1, correctCount: 0 });
  const store = { snapshot: () => structuredClone(db), update: async <T>(mutate: (data: Database) => T) => mutate(db) } as StoreService;
  return { db, service: new StudyService(store) };
}

test('a wrong word can be retried once without changing SRS twice', async () => {
  const { db, service } = fixture();
  const first = await service.answer({ sessionId: 'session-1', wordId: 'l1-arrive', quizType: 'B', isCorrect: false, hintUsed: false });
  assert.equal(first.attempt, 1);
  assert.equal(first.retryRequired, true);
  assert.equal(first.stage, 0);
  const second = await service.answer({ sessionId: 'session-1', wordId: 'l1-arrive', quizType: 'A', isCorrect: true, hintUsed: false });
  assert.equal(second.attempt, 2);
  assert.equal(second.retryRequired, false);
  assert.equal(second.stage, 0);
  assert.deepEqual(db.studyLogs.map(log => log.attempt), [1, 2]);
  await assert.rejects(() => service.answer({ sessionId: 'session-1', wordId: 'l1-arrive', quizType: 'A', isCorrect: true, hintUsed: false }), /ANSWER_ALREADY_SUBMITTED/);
});

test('a correct first answer cannot be submitted again', async () => {
  const { service } = fixture();
  await service.answer({ sessionId: 'session-1', wordId: 'l1-arrive', quizType: 'B', isCorrect: true, hintUsed: false });
  await assert.rejects(() => service.answer({ sessionId: 'session-1', wordId: 'l1-arrive', quizType: 'B', isCorrect: true, hintUsed: false }), /ANSWER_ALREADY_SUBMITTED/);
});

test('daily study prioritizes the chosen B2–C2 level and retains previously learned reviews', async () => {
  for (const [preferred, expected] of [[null, [4, 5, 6]], [2, [4, 5, 6]], [4, [4, 5, 6]], [5, [5, 4, 6]], [6, [6, 5, 4]]] as const) {
    const { db, service } = fixture();
    db.settings.userLevel = preferred;
    db.settings.dailyNewCount = 5;
    db.words = [1, 2, 3, 4, 5, 6].map(level => db.words.find(word =>
      word.hasExample && word.level === level && (level !== 1 || word.id === 'l1-arrive'))!);
    const previous = structuredClone(db.userWords[0]);

    const session = await service.create({ kind: 'daily' });
    assert.deepEqual(session.newWords.map(word => word.level), expected);
    assert.ok(session.quizQueue.some(quiz => quiz.wordId === previous.wordId));
    assert.deepEqual(db.userWords[0], previous);
    assert.equal(db.settings.userLevel, preferred);

    for (const word of session.newWords) {
      await service.answer({ sessionId: session.sessionId, wordId: word.id, quizType: 'A', isCorrect: true, hintUsed: false });
    }
    const next = await service.create({ kind: 'daily' });
    assert.equal(next.newWords.length, 0);
  }
});

test('an oversized abandoned session does not turn unattempted words into reviews', async () => {
  const { db, service } = fixture();
  const store = { snapshot: () => structuredClone(db) } as StoreService;
  db.settings.userLevel = 5;
  const unattempted = db.words.filter(word => word.hasExample && word.level >= 4);
  assert.ok(unattempted.length > 1000);
  db.userWords.push(...unattempted.map(word => ({
    ...db.userWords[0], id: word.id, wordId: word.id, stage: 0, status: 'new' as const,
  })));
  assert.equal(new StatsService(store).summary().today.dueCount, 1);
  const session = await service.create({ kind: 'daily' });
  assert.equal(session.newWords.length, 10);
  assert.ok(session.newWords.every(word => word.level === 5));
  assert.equal(session.quizQueue.length, 11);
  assert.equal(db.userWords.length, unattempted.length + 1);
  const review = await service.create({ kind: 'review' });
  assert.deepEqual(review.quizQueue.map(quiz => quiz.wordId), ['l1-arrive']);
});
