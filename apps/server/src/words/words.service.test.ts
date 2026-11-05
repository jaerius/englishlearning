import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { emptyDatabase } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import { WordsService } from './words.service.js';

test('word search pages deterministically without changing the existing list', () => {
  const db = emptyDatabase();
  const service = new WordsService({ snapshot: () => structuredClone(db) } as StoreService);
  const all = service.list();
  assert.equal(all.length, db.words.length);
  const first = service.search('', '', '20');
  const second = service.search('', first.nextCursor!, '20');
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 20);
  assert.equal(new Set([...first.items, ...second.items].map(word => word.id)).size, 40);
  assert.equal(first.total, db.words.length);
  assert.ok(service.search('raise a concern').items.some(word => word.word === 'raise a concern'));
  assert.throws(() => service.search('', 'bad-id'), BadRequestException);
  assert.throws(() => service.search('', '', '10000'), BadRequestException);
});
