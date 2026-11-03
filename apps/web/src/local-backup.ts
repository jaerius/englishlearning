import { localWords, type LocalDaily, type LocalProgress } from './local-learning';

export type Backup = { format: 'lingo-loop-local-v1'; exportedAt: string; localProgress: LocalProgress; localDaily: LocalDaily };
const knownIds = new Set(localWords.map(word => word.id));

export function parseLocalBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>;
  if (data.format !== 'lingo-loop-local-v1' || !data.localProgress || !data.localDaily || typeof data.localProgress !== 'object' || typeof data.localDaily !== 'object') throw new Error('이 앱의 학습 백업 파일이 아니에요.');
  for (const [id, item] of Object.entries(data.localProgress)) {
    if (!knownIds.has(id) || !item || !Number.isInteger(item.stage) || item.stage < 0 || item.stage > 5 || !Number.isInteger(item.wrongCount) || item.wrongCount < 0 || !Number.isInteger(item.correctCount) || item.correctCount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(item.nextReviewAt)) throw new Error('단어 기록이 올바르지 않아요.');
  }
  for (const [day, item] of Object.entries(data.localDaily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !item || !Number.isInteger(item.studiedCount) || item.studiedCount < 0 || !Number.isInteger(item.correctCount) || item.correctCount < 0 || item.correctCount > item.studiedCount || !Number.isInteger(item.sessionCount) || item.sessionCount < 0) throw new Error('일별 기록이 올바르지 않아요.');
  }
  return data as Backup;
}
