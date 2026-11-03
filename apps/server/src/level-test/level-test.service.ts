import { BadRequestException, Injectable } from '@nestjs/common';
import { generateLevelTest, type WordSeed } from '@lingo-loop/content/dist/index.js';
import { StoreService } from '../common/store.service.js';
import { SubmitLevelTestDto } from './level-test.dto.js';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

@Injectable()
export class LevelTestService {
  constructor(private readonly store: StoreService) {}

  questions() {
    const words = this.store.snapshot().words;
    const questions = generateLevelTest(words as WordSeed[]);
    // The answer key stays on the server. Only questions and shuffled choices leave the API.
    return questions.map(({ wordId, level, word, choices }) => ({
      wordId, level, word, pos: words.find(item => item.id === wordId)?.pos ?? 'noun', options: choices,
    }));
  }

  async submit(input: SubmitLevelTestDto) {
    const words = this.store.snapshot().words;
    if (new Set(input.answers.map(answer => answer.wordId)).size !== 24) throw new BadRequestException('DUPLICATE_LEVEL_ANSWER');
    for (const answer of input.answers) {
      const word = words.find(item => item.id === answer.wordId);
      if (!word || word.level !== answer.level) throw new BadRequestException('INVALID_LEVEL_ANSWER');
    }
    if (LEVELS.some(level => input.answers.filter(answer => answer.level === level).length !== 4)) throw new BadRequestException('INVALID_LEVEL_DISTRIBUTION');
    const perLevelCorrect = LEVELS.map(level => ({
      level,
      correct: input.answers.filter(answer => answer.level === level && answer.selectedMeaning === words.find(word => word.id === answer.wordId)?.meaningKo).length,
    }));
    // Four vocabulary items per band give only an initial placement, not a formal CEFR assessment.
    const level = Math.max(1, ...perLevelCorrect.filter(item => item.correct >= 3).map(item => item.level));
    await this.store.update(db => { db.settings.userLevel = level; });
    return { level, cefr: CEFR[level - 1], perLevelCorrect, assessment: 'vocabulary_estimate' as const };
  }
}
