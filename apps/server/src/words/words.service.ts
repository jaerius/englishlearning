import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../common/store.service.js';

@Injectable()
export class WordsService {
  constructor(private readonly store: StoreService) {}

  list(level?: number) { return this.store.snapshot().words.filter(word => !level || word.level === level); }

  search(query = '', cursor = '', limitRaw = '30', levelRaw = '', domain = '') {
    const limit = Number(limitRaw);
    const level = levelRaw ? Number(levelRaw) : null;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      (level !== null && (!Number.isInteger(level) || level < 1 || level > 6)) ||
      (domain && !['general', 'business'].includes(domain)) || query.length > 100 || cursor.length > 100) {
      throw new BadRequestException('INVALID_WORD_SEARCH');
    }
    const needle = query.trim().toLocaleLowerCase('en-US');
    const items = this.store.snapshot().words.filter(word =>
      (!level || word.level === level) && (!domain || word.domain === domain) &&
      (!needle || word.word.toLocaleLowerCase('en-US').includes(needle) || word.meaningKo.includes(query.trim()))
    ).sort((a, b) => a.id.localeCompare(b.id));
    const start = cursor ? items.findIndex(item => item.id === cursor) + 1 : 0;
    if (cursor && start === 0) throw new BadRequestException('INVALID_WORD_CURSOR');
    const page = items.slice(start, start + limit);
    return { items: page, nextCursor: start + limit < items.length ? page.at(-1)?.id ?? null : null, total: items.length };
  }

  one(id: string) {
    const db = this.store.snapshot(), word = db.words.find(item => item.id === id), progress = db.userWords.find(item => item.wordId === id);
    if (!word) throw new NotFoundException('WORD_NOT_FOUND');
    return { ...word, progress: progress || null };
  }
}
