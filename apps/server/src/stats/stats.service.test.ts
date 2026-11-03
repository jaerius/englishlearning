import assert from 'node:assert/strict';
import test from 'node:test';
import type { Database, DailyStat } from '../common/models.js';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import type { SpeakingData } from '../speaking/speaking.models.js';
import { StatsService } from './stats.service.js';

const now = new Date('2026-11-03T12:00:00Z');
const stat = (date: string, studiedCount: number, correctCount: number, sessionCount = 1): DailyStat =>
  ({ date, studiedCount, correctCount, sessionCount, aiTurns: 0 });

function fixture() {
  const db = emptyDatabase();
  const store = { snapshot: () => structuredClone(db) } as StoreService;
  return { db, service: new StatsService(store) };
}

test('a new learner has zero real stats, wrong notes, and no claimed weakness', () => {
  const { service } = fixture();
  const summary = service.summary(now);
  assert.equal(summary.streak, 0);
  assert.equal(summary.masteredCount, 0);
  assert.equal(summary.weeklyAccuracy, 0);
  assert.equal(summary.weeklyAttemptCount, 0);
  assert.equal(summary.today.wrongCount, 0);
  assert.deepEqual(service.weekly(now).map(day => day.studiedCount), [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(service.coach(now).weaknesses, []);
  assert.equal(service.coach(now).insufficientData, true);
});

test('weekly accuracy uses the last seven Seoul calendar days, not old recorded days', () => {
  const { db, service } = fixture();
  db.dailyStats.push(stat('2026-10-01', 100, 100), stat('2026-11-02', 2, 1), stat('2026-11-03', 2, 1));
  const summary = service.summary(now);
  assert.equal(summary.weeklyAccuracy, 50);
  assert.equal(summary.weeklyAttemptCount, 4);
  assert.equal(service.weekly(now).length, 7);
  assert.equal(service.weekly(now)[0].date, '2026-10-28');
});

test('memorized count follows the spec threshold of stage four', () => {
  const { db, service } = fixture();
  db.userWords.push({ id: 'known', wordId: db.words[0].id, stage: 4, nextReviewAt: '2026-12-01', correctCount: 4, wrongCount: 0, status: 'learning', flaggedUnknown: false, spokenCount: 0, lastSpokenAt: null, lastStudiedAt: null });
  assert.equal(service.summary(now).masteredCount, 1);
});

test('streak counts only days with completed word activity; yesterday can preserve a streak', () => {
  const { db, service } = fixture();
  db.dailyStats.push(stat('2026-11-01', 3, 2), stat('2026-11-02', 4, 3), stat('2026-11-03', 0, 0));
  assert.equal(service.summary(now).streak, 2);
  db.dailyStats[2].studiedCount = 2;
  assert.equal(service.summary(now).streak, 3);
  db.dailyStats[1].studiedCount = 0;
  assert.equal(service.summary(now).streak, 1);
});

test('coach groups only first attempts from recent study logs and identifies weak CEFR/POS', () => {
  const { db, service } = fixture();
  const first = db.words.find(word => word.cefr === 'A1' && word.pos === 'verb');
  const second = db.words.find(word => word.cefr === 'A1' && word.pos === 'verb' && word.id !== first?.id);
  assert.ok(first && second);
  db.studyLogs.push(
    { id: '1', sessionId: 's', wordId: first.id, quizType: 'A', attempt: 1, isCorrect: false, hintUsed: false, answeredAt: '2026-11-03T01:00:00Z' },
    { id: '2', sessionId: 's', wordId: first.id, quizType: 'A', attempt: 2, isCorrect: true, hintUsed: false, answeredAt: '2026-11-03T01:01:00Z' },
    { id: '3', sessionId: 's', wordId: second.id, quizType: 'A', attempt: 1, isCorrect: false, hintUsed: true, answeredAt: '2026-11-03T02:00:00Z' },
    { id: '4', sessionId: 's', wordId: second.id, quizType: 'A', attempt: 1, isCorrect: true, hintUsed: false, answeredAt: '2026-09-01T02:00:00Z' },
  );
  const report = service.coach(now);
  assert.equal(report.sampleSize, 2);
  assert.deepEqual(report.weaknesses, [{ cefr: 'A1', pos: 'verb', attempts: 2, wrong: 2, hint: 1, accuracy: 0 }]);
  assert.equal(report.insufficientData, true);
});

test('coach includes corrections from finished recent speaking sessions only', () => {
  const { db, service } = fixture();
  (db as Database & SpeakingData).speakingSessions = [{
    id: 'recent', scenarioId: 'cafe', cefr: 'A2', targetWords: [], messages: [], usedWordIds: [],
    startedAt: '2026-11-03T01:00:00Z', finishedAt: '2026-11-03T02:00:00Z',
    summary: { corrections: [{ original: 'I want coffee', corrected: "I'd like a coffee", explanationKo: '더 정중한 표현' }], expressions: [], targetWords: [] },
  }];
  assert.deepEqual(service.coach(now).speakingCorrections, [{ original: 'I want coffee', corrected: "I'd like a coffee", explanationKo: '더 정중한 표현', at: '2026-11-03T02:00:00Z' }]);
});
