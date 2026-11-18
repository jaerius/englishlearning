import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import type { Database } from '../common/models.js';
import { emptyDatabase, restoreSettings } from '../common/seed.js';
import type { StoreService } from '../common/store.service.js';
import { UpdateSettingsDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

test('updating a single setting through a transformed request preserves the other settings', async () => {
  const db = emptyDatabase();
  db.settings.reviewCap = 20;
  db.settings.dailyNewCount = 15;
  db.settings.soundOn = false;
  const store = { update: async <T>(mutate: (data: Database) => T) => mutate(db) } as StoreService;
  const service = new SettingsService(store);
  const input = plainToInstance(UpdateSettingsDto, { userLevel: 5, reviewCap: null });
  const before = { ...db.settings };
  assert.deepEqual(await service.update(input), { ...before, userLevel: 5 });
});

test('saved settings recover missing and unsupported batch sizes', () => {
  const settings = restoreSettings({ userLevel: 5, reviewCap: 1684, soundOn: false });
  assert.equal(settings.dailyNewCount, 10);
  assert.equal(settings.reviewCap, 30);
  assert.equal(settings.userLevel, 5);
  assert.equal(settings.soundOn, false);
});
