export const STUDY_TIME_KEY = 'lingo-loop-study-time-v1';

export function validStudyTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return true;
}

export function loadStudyTime(): string | null {
  try {
    const saved = window.localStorage.getItem(STUDY_TIME_KEY);
    return validStudyTime(saved) ? saved : null;
  } catch { return null; }
}

export function saveStudyTime(value: string | null): void {
  if (value !== null && !validStudyTime(value)) throw new Error('학습 시간을 확인해 주세요.');
  if (value === null) window.localStorage.removeItem(STUDY_TIME_KEY);
  else window.localStorage.setItem(STUDY_TIME_KEY, value);
  window.dispatchEvent(new Event('study-time-changed'));
}

export function kstClock(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  }).formatToParts(now);
  const hour = parts.find(part => part.type === 'hour')?.value ?? '00';
  const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export function shouldPromptStudy(studyTime: string | null, studiedToday: boolean, now = new Date()): boolean {
  return Boolean(studyTime && validStudyTime(studyTime) && !studiedToday && kstClock(now) >= studyTime);
}
