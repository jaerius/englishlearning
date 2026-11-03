import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import type { Database } from '../common/models.js';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import type { SpeakingData } from './speaking.models.js';
import { SpeakingProvider } from './speaking.provider.js';
import { SpeakingService } from './speaking.service.js';

class MemoryStore {
  data: Database & SpeakingData = emptyDatabase();
  snapshot() { return structuredClone(this.data); }
  async update<T>(mutate: (db: Database) => T): Promise<T> { return mutate(this.data); }
}

test('speaking provider is unavailable unless mock is explicitly enabled', async () => {
  const previous = process.env.SPEAKING_PROVIDER;
  delete process.env.SPEAKING_PROVIDER;
  try {
    const service = new SpeakingService(new MemoryStore() as unknown as StoreService, new SpeakingProvider());
    const session = await service.start({ scenarioId: 'cafe', cefr: 'A2', targetWords: [] });
    await assert.rejects(() => service.turn(session.id, { text: 'Hello' }), ServiceUnavailableException);
    assert.equal((service as unknown as { store: MemoryStore }).store.data.dailyStats[0].aiTurns, 0);
  } finally {
    if (previous === undefined) delete process.env.SPEAKING_PROVIDER; else process.env.SPEAKING_PROVIDER = previous;
  }
});

test('turn response hides correction content and finish reveals the persisted summary', async () => {
  const previous = process.env.SPEAKING_PROVIDER;
  process.env.SPEAKING_PROVIDER = 'mock';
  try {
    const store = new MemoryStore();
    const service = new SpeakingService(store as unknown as StoreService, new SpeakingProvider());
    const session = await service.start({ scenarioId: 'cafe', cefr: 'A2', targetWords: [{ id: 'word-1', word: 'coffee', meaningKo: '커피' }] });
    const first = await service.turn(session.id, { text: 'I want coffee' });
    assert.deepEqual(Object.keys(first).sort(), ['hasCorrection', 'reply', 'turnsRemaining', 'usedWords', 'userText']);
    assert.equal(first.hasCorrection, true);
    assert.equal(JSON.stringify(first).includes('corrected'), false);
    await service.turn(session.id, { text: 'coffee sounds good' });
    await service.turn(session.id, { text: 'coffee please' });
    const finished = await service.finish(session.id);
    assert.equal(finished.summary?.corrections[0].corrected, "I'd like a coffee, please.");
    assert.match(finished.summary?.coaching?.focusKo ?? '', /주문/);
    assert.equal(store.data.speakingSessions?.[0].messages.length, 6);
    assert.equal(store.data.dailyStats[0].aiTurns, 3);
  } finally {
    if (previous === undefined) delete process.env.SPEAKING_PROVIDER; else process.env.SPEAKING_PROVIDER = previous;
  }
});

test('daily turn limit is enforced from persistent daily stats', async () => {
  const previous = process.env.SPEAKING_PROVIDER;
  process.env.SPEAKING_PROVIDER = 'mock';
  try {
    const store = new MemoryStore(); store.data.settings.dailyAiTurnLimit = 1;
    const service = new SpeakingService(store as unknown as StoreService, new SpeakingProvider());
    const session = await service.start({ scenarioId: 'cafe', cefr: 'A2' });
    await service.turn(session.id, { text: 'Hello' });
    await assert.rejects(() => service.turn(session.id, { text: 'Again' }), (error: unknown) => Boolean(error && typeof error === 'object' && 'status' in error && error.status === 429));
  } finally {
    if (previous === undefined) delete process.env.SPEAKING_PROVIDER; else process.env.SPEAKING_PROVIDER = previous;
  }
});
