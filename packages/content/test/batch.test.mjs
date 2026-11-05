import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('draft batch cannot be published', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lingo-batch-'));
  const file = join(dir, 'batch.json');
  try {
    await writeFile(file, JSON.stringify({ packId: 'test', version: 1, items: [{ id: 'test-entry', review: { status: 'draft' } }] }));
    const run = spawnSync(process.execPath, ['scripts/check-batch.mjs', file], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.equal(run.signal, null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('empty batch cannot pass review checks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lingo-empty-batch-'));
  const file = join(dir, 'batch.json');
  try {
    await writeFile(file, JSON.stringify({ packId: 'empty', version: 1, items: [] }));
    const run = spawnSync(process.execPath, ['scripts/check-batch.mjs', file], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
    assert.equal(run.status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
