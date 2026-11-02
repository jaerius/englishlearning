import test from 'node:test';
import assert from 'node:assert/strict';
import type { Database } from '../common/models.js';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import { StudyService } from './study.service.js';

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
