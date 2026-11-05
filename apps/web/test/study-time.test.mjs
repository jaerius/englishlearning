import assert from 'node:assert/strict';
import test from 'node:test';
import { kstClock, shouldPromptStudy, validStudyTime } from '../src/study-time.ts';

test('study time only accepts a real 24-hour clock value', () => {
  assert.equal(validStudyTime('20:30'), true);
  assert.equal(validStudyTime('24:00'), false);
  assert.equal(validStudyTime('20:60'), false);
  assert.equal(validStudyTime('8:00'), false);
});

test('an in-app prompt begins at the saved Seoul time and stops after study', () => {
  assert.equal(kstClock(new Date('2026-11-04T10:59:00Z')), '19:59');
  assert.equal(shouldPromptStudy('20:00', false, new Date('2026-11-04T10:59:00Z')), false);
  assert.equal(shouldPromptStudy('20:00', false, new Date('2026-11-04T11:00:00Z')), true);
  assert.equal(shouldPromptStudy('20:00', true, new Date('2026-11-04T11:00:00Z')), false);
  assert.equal(shouldPromptStudy(null, false, new Date('2026-11-04T11:00:00Z')), false);
});
