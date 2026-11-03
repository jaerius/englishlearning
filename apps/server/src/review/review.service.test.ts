import test from 'node:test';
import assert from 'node:assert/strict';
import type { Database } from '../common/models.js';
import { emptyDatabase, seededWords } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import { kstDate } from '../common/date.js';
import { ReviewService } from './review.service.js';

function fixture(): { db: Database; service: ReviewService } {
  const db = emptyDatabase();
  db.userWords.push({ id: 'mastered-due', wordId: 'l1-arrive', stage: 5, nextReviewAt: kstDate(), correctCount: 6, wrongCount: 0, status: 'mastered', flaggedUnknown: false, spokenCount: 0, lastSpokenAt: null, lastStudiedAt: null });
  const store = { snapshot: () => structuredClone(db), update: async <T>(mutate: (data: Database) => T) => mutate(db) } as StoreService;
  return { db, service: new ReviewService(store) };
}

test('the shared content package has unique seeded word ids', () => {
  assert.ok(seededWords().length >= 60);
  assert.equal(new Set(seededWords().map(word => word.id)).size, seededWords().length);
});

test('mastered words return to due review when their date arrives', () => {
  const { service } = fixture();
  assert.deepEqual(service.due(true), { count: 1 });
});

test('flaggedUnknown can be set and cleared', async () => {
  const { db, service } = fixture();
  await service.update('l1-arrive', undefined, true);
  assert.equal(db.userWords[0]?.flaggedUnknown, true);
  await service.update('l1-arrive', undefined, false);
  assert.equal(db.userWords[0]?.flaggedUnknown, false);
});
