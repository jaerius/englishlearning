import { BadRequestException, Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service.js';
import { SubmitLevelTestDto } from './level-test.dto.js';

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

@Injectable()
export class LevelTestService {
  constructor(private readonly store: StoreService) {}
  questions() {
    const words = this.store.snapshot().words;
    return [1, 2, 3, 4, 5].flatMap(level => {
      const pool = words.filter(word => word.level === level);
      if (pool.length < 7) throw new BadRequestException('INSUFFICIENT_LEVEL_WORDS');
      return shuffled(pool).slice(0, 4).map(word => ({
        wordId: word.id, level, word: word.word, pos: word.pos,
        options: shuffled([word.meaningKo, ...shuffled(pool.filter(item => item.id !== word.id && item.meaningKo !== word.meaningKo)).slice(0, 3).map(item => item.meaningKo)]),
      }));
    });
  }
  async submit(input: SubmitLevelTestDto) {
    const words = this.store.snapshot().words;
    if (new Set(input.answers.map(answer => answer.wordId)).size !== 20) throw new BadRequestException('DUPLICATE_LEVEL_ANSWER');
    for (const answer of input.answers) {
      const word = words.find(item => item.id === answer.wordId);
      if (!word || word.level !== answer.level) throw new BadRequestException('INVALID_LEVEL_ANSWER');
    }
    if ([1, 2, 3, 4, 5].some(level => input.answers.filter(answer => answer.level === level).length !== 4)) throw new BadRequestException('INVALID_LEVEL_DISTRIBUTION');
    const perLevelCorrect = [1, 2, 3, 4, 5].map(level => ({
      level,
      correct: input.answers.filter(answer => answer.level === level && answer.selectedMeaning === words.find(word => word.id === answer.wordId)?.meaningKo).length,
    }));
    const level = Math.max(1, ...perLevelCorrect.filter(item => item.correct >= 3).map(item => item.level));
    await this.store.update(db => { db.settings.userLevel = level; });
    return { level, cefr: ['A1', 'A2', 'B1', 'B2', 'C1'][level - 1], perLevelCorrect };
  }
}
