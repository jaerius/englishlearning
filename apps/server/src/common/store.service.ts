import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Database } from './models.js';
import { emptyDatabase, seededWords } from './seed.js';

@Injectable()
export class StoreService implements OnModuleInit {
  private data: Database = emptyDatabase();
  private readonly file = resolve(process.env.DATA_FILE || 'data/lingo-loop.json');
  private queue: Promise<void> = Promise.resolve();
  async onModuleInit(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Database;
      if (!Array.isArray(parsed.userWords) || !Array.isArray(parsed.studyLogs) || !Array.isArray(parsed.dailyStats) || !parsed.settings) {
        throw new Error('학습 데이터 파일의 형식이 올바르지 않습니다. 백업에서 복구하세요.');
      }
      this.data = parsed;
      this.data.words = seededWords();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.persist();
    }
  }
  snapshot(): Database { return structuredClone(this.data); }
  async update<T>(mutate: (db: Database) => T): Promise<T> {
    let value!: T;
    const work = this.queue.then(async () => {
      const next = structuredClone(this.data);
      value = mutate(next);
      await this.persist(next);
      this.data = next;
    });
    this.queue = work.catch(() => undefined);
    await work;
    return value;
  }
  private async persist(data: Database = this.data): Promise<void> { const temp = `${this.file}.tmp`; await writeFile(temp, JSON.stringify(data, null, 2)); await rename(temp, this.file); }
}
