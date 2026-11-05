import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import type { Database } from '../common/models.js';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import type { SpeakingData } from './speaking.models.js';
import { SpeakingProvider, normalizeLanguageInsights } from './speaking.provider.js';
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
    assert.equal(finished.summary?.languageInsights?.[0].original, 'I want coffee');
    assert.match(finished.summary?.languageInsights?.[0].written ?? '', /order a coffee/);
    assert.equal(finished.summary?.languageInsights?.[0].synonyms.length, 2);
    assert.equal(store.data.speakingSessions?.[0].messages.length, 6);
    assert.equal(store.data.dailyStats[0].aiTurns, 3);
  } finally {
    if (previous === undefined) delete process.env.SPEAKING_PROVIDER; else process.env.SPEAKING_PROVIDER = previous;
  }
});

test('language insights only keep actual utterances and bounded alternatives', () => {
  const insights = normalizeLanguageInsights([
    { original: 'I never said this', naturalAlternative: 'Hello', spoken: 'Hello', written: 'Hello', explanationKo: '설명', synonyms: [] },
    { original: 'I want coffee', naturalAlternative: "I'd like a coffee.", spoken: 'Can I get a coffee?', written: 'I would like a coffee.', explanationKo: '정중한 표현', synonyms: [{ expression: 'Could I have', nuanceKo: '더 부드러움' }] },
    { original: 'I want coffee', naturalAlternative: 'duplicate', spoken: 'duplicate', written: 'duplicate', explanationKo: '중복', synonyms: [] },
  ], ['I want coffee']);
  assert.equal(insights.length, 1);
  assert.equal(insights[0].original, 'I want coffee');
  assert.equal(insights[0].synonyms[0].nuanceKo, '더 부드러움');
});

test('OpenAI key alone powers live conversation and records usage', async () => {
  const old = { provider: process.env.SPEAKING_PROVIDER, openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY, choice: process.env.AI_CHAT_PROVIDER };
  const oldFetch = globalThis.fetch;
  process.env.SPEAKING_PROVIDER = 'live';
  process.env.OPENAI_API_KEY = 'test-only';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AI_CHAT_PROVIDER;
  const store = new MemoryStore();
  globalThis.fetch = async (input, init) => {
    assert.equal(input, 'https://api.openai.com/v1/chat/completions');
    assert.equal(JSON.parse(String(init?.body)).model, 'gpt-4o-mini');
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: 'How was your day?', usedWords: [], correction: null }) } }], usage: { prompt_tokens: 12, completion_tokens: 8 } }), { status: 200 });
  };
  try {
    const provider = new SpeakingProvider(store as unknown as StoreService);
    const response = await provider.reply('Hello', []);
    assert.equal(response.reply, 'How was your day?');
    assert.equal(store.data.dailyStats[0].openaiInputTokens, 12);
    assert.equal(store.data.dailyStats[0].openaiOutputTokens, 8);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries({ SPEAKING_PROVIDER: old.provider, OPENAI_API_KEY: old.openai, ANTHROPIC_API_KEY: old.anthropic, AI_CHAT_PROVIDER: old.choice })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
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
