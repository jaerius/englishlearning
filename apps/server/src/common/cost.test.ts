import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyDatabase } from './seed.js';
import { monthlyCost } from './cost.js';

test('monthly estimate includes only current KST month and conservative 30-second STT requests', () => {
  const db = emptyDatabase();
  db.dailyStats.push(
    { date: '2026-11-01', studiedCount: 0, correctCount: 0, sessionCount: 0, aiTurns: 1, sttRequests: 2, anthropicInputTokens: 1_000_000, anthropicOutputTokens: 100_000 },
    { date: '2026-10-31', studiedCount: 0, correctCount: 0, sessionCount: 0, aiTurns: 1, sttRequests: 1000, anthropicInputTokens: 1_000_000, anthropicOutputTokens: 1_000_000 },
  );
  const cost = monthlyCost(db, new Date('2026-11-01T03:00:00Z'));
  assert.equal(cost.month, '2026-11');
  assert.equal(cost.inputTokens, 1_000_000);
  assert.equal(cost.outputTokens, 100_000);
  assert.equal(cost.sttRequests, 2);
  assert.equal(cost.estimatedKrw, 2255);
});
