import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Database } from './models.js';
import { emptyDatabase, seededWords } from './seed.js';

@Injectable()
export class StoreService implements OnModuleInit {
  private data: Database = emptyDatabase();
  private readonly file = resolve(process.env.DATA_FILE || 'data/lingo-loop.sqlite');
  private database!: DatabaseSync;
  private queue: Promise<void> = Promise.resolve();

  async onModuleInit(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    this.database = new DatabaseSync(this.file);
    this.database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;');
    const row = this.database.prepare('SELECT payload FROM app_state WHERE id = 1').get() as { payload: string } | undefined;
    if (row) {
      const parsed = JSON.parse(row.payload) as Database;
      if (!Array.isArray(parsed.userWords) || !Array.isArray(parsed.studyLogs) || !Array.isArray(parsed.dailyStats) || !parsed.settings) {
        throw new Error('학습 데이터 형식이 올바르지 않습니다. 백업에서 복구하세요.');
      }
      this.data = parsed;
      this.data.words = seededWords();
    } else {
      this.persist(this.data);
    }
  }

  snapshot(): Database { return structuredClone(this.data); }

  async update<T>(mutate: (db: Database) => T): Promise<T> {
    let value!: T;
    const work = this.queue.then(() => {
      const next = structuredClone(this.data);
      value = mutate(next);
      this.persist(next);
      this.data = next;
    });
    this.queue = work.catch(() => undefined);
    await work;
    return value;
  }

  private persist(data: Database): void {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare('INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at')
        .run(JSON.stringify(data), new Date().toISOString());
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
