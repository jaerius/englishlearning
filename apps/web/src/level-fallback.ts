import { WORD_SEEDS } from '../../../packages/content/src/words';
import type { LevelQuestion } from './api';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function localLevelQuestions(): LevelQuestion[] {
  const byLevel = [1, 2, 3, 4, 5, 6].map(level => {
    const pool = WORD_SEEDS.filter(word => word.level === level);
    return shuffle(pool).slice(0, 4).map(word => ({
      wordId: word.id, level, word: word.word, pos: word.pos,
      options: [word.meaningKo, ...shuffle(pool.filter(other => other.id !== word.id && other.meaningKo !== word.meaningKo)).slice(0, 3).map(other => other.meaningKo)],
    }));
  });
  const order = [3, 4, 5, 6, 2, 1].map(level => level - 1);
  return Array.from({ length: 4 }, (_, round) => order.map(levelIndex => byLevel[levelIndex][round])).flat()
    .map((question, index) => {
      const options = [...question.options], correct = options.shift()!;
      options.splice(index % 4, 0, correct);
      return { ...question, options };
    });
}

export function localLevelScores(questions: LevelQuestion[], selected: Array<string | null>): number[] {
  return [1, 2, 3, 4, 5, 6].map(level => questions.reduce((count, question, index) => {
    const correct = WORD_SEEDS.find(word => word.id === question.wordId)?.meaningKo;
    return count + Number(question.level === level && selected[index] === correct);
  }, 0));
}
