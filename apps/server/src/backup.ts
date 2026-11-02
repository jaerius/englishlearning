import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

async function main(): Promise<void> {
  const source = resolve(process.env.DATA_FILE || 'data/lingo-loop.sqlite');
  const destination = process.argv[2];
  if (!destination) throw new Error('Backup destination is required');
  await mkdir(dirname(destination), { recursive: true });
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, destination);
    const copy = new DatabaseSync(destination, { readOnly: true });
    try {
      const check = copy.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (check.integrity_check !== 'ok') throw new Error(`Backup integrity failed: ${check.integrity_check}`);
      const row = copy.prepare('SELECT payload FROM app_state WHERE id = 1').get() as { payload: string } | undefined;
      if (!row) throw new Error('Backup does not contain application data');
      JSON.parse(row.payload);
    } finally { copy.close(); }
  } finally { db.close(); }
  console.log(destination);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
