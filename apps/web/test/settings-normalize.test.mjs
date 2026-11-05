import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSettings, reviewCount } from '../src/settings-normalize.ts';

test('older saved settings cannot produce NaN counts', () => {
  const settings = normalizeSettings({ level: 3, sound: false });
  assert.equal(settings.reviewCap, 30);
  assert.equal(settings.dailyNew, 10);
  assert.equal(settings.sound, false);
  assert.equal(reviewCount(settings.reviewCap, 5), 5);
  assert.equal(reviewCount(undefined, 5), 5);
  assert.equal(reviewCount(undefined, undefined), 0);
  assert.equal(reviewCount(Number.NaN, Number.NaN), 0);
});

test('invalid server or stored values recover to supported settings', () => {
  assert.equal(normalizeSettings({ reviewCap: '30', dailyNew: Number.NaN, level: 99 }).reviewCap, 30);
  assert.equal(normalizeSettings({ reviewCap: 50, dailyNew: 20, level: 6 }).reviewCap, 50);
});
