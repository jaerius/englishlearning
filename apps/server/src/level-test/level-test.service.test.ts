import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import type { Database } from '../common/models.js';
import { LevelTestService } from './level-test.service.js';

class MemoryStore {
  data = emptyDatabase();
  snapshot() { return structuredClone(this.data); }
  async update<T>(mutate: (db: Database) => T): Promise<T> { return mutate(this.data); }
}

test('assessment covers A1–C2 with balanced answer positions and no exposed answer key', () => {
  const store = new MemoryStore();
  const questions = new LevelTestService(store as unknown as StoreService).questions();
  assert.equal(questions.length, 24);
  assert.equal(questions[0].level, 3);
  const positions = [0, 0, 0, 0];
  for (const level of [1, 2, 3, 4, 5, 6]) assert.equal(questions.filter(item => item.level === level).length, 4);
  for (const question of questions) {
    assert.equal('correctMeaning' in question, false);
    const answer = store.data.words.find(word => word.id === question.wordId)!.meaningKo;
    positions[question.options.indexOf(answer)] += 1;
  }
  assert.deepEqual(positions, [6, 6, 6, 6]);
});

test('C2 placement persists only after the full 24-question assessment', async () => {
  const store = new MemoryStore();
  const service = new LevelTestService(store as unknown as StoreService);
  const answers = service.questions().map(question => ({
    wordId: question.wordId,
    level: question.level,
    selectedMeaning: store.data.words.find(word => word.id === question.wordId)!.meaningKo,
  }));
  const result = await service.submit({ answers });
  assert.equal(result.level, 6);
  assert.equal(result.cefr, 'C2');
  assert.equal(result.assessment, 'vocabulary_estimate');
  assert.equal(store.data.settings.userLevel, 6);
  await assert.rejects(() => service.submit({ answers: [...answers.slice(0, 23), answers[0]] }), { message: 'DUPLICATE_LEVEL_ANSWER' });
});
