import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service.js';
import { kstDate } from '../common/date.js';
import { monthlyCost } from '../common/cost.js';
import type { SpeakingData } from '../speaking/speaking.models.js';

function daysBefore(date: string, count: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - count);
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class StatsService {
  constructor(private readonly store: StoreService) {}

  private streak(activeDates: string[], today: string): number {
    const dates = new Set(activeDates);
    let cursor = dates.has(today) ? today : daysBefore(today, 1);
    let count = 0;
    while (dates.has(cursor)) {
      count += 1;
      cursor = daysBefore(cursor, 1);
    }
    return count;
  }

  summary(now = new Date()) {
    const db = this.store.snapshot();
    const todayDate = kstDate(now);
    const weekStart = daysBefore(todayDate, 6);
    const recent = db.dailyStats.filter(item => item.date >= weekStart && item.date <= todayDate);
    const correct = recent.reduce((sum, item) => sum + item.correctCount, 0);
    const studied = recent.reduce((sum, item) => sum + item.studiedCount, 0);
    const today = db.dailyStats.find(item => item.date === todayDate);
    return {
      streak: this.streak(db.dailyStats.filter(item => item.studiedCount > 0).map(item => item.date), todayDate),
      masteredCount: db.userWords.filter(item => item.stage >= 4).length,
      weeklyAccuracy: studied ? Math.round(correct / studied * 100) : 0,
      weeklyAttemptCount: studied,
      today: {
        studiedCount: today?.studiedCount ?? 0,
        goal: db.settings.dailyNewCount,
        dueCount: db.userWords.filter(item => item.nextReviewAt <= todayDate).length,
        wrongCount: db.userWords.filter(item => item.wrongCount > 0 && item.stage < 4).length,
        aiTurns: today?.aiTurns ?? 0,
      },
    };
  }

  weekly(now = new Date()) {
    const db = this.store.snapshot();
    const today = kstDate(now);
    return Array.from({ length: 7 }, (_, index) => {
      const date = daysBefore(today, 6 - index);
      const stat = db.dailyStats.find(item => item.date === date);
      return { date, studiedCount: stat?.studiedCount ?? 0, correctCount: stat?.correctCount ?? 0 };
    });
  }

  coach(now = new Date()) {
    const db = this.store.snapshot() as ReturnType<StoreService['snapshot']> & SpeakingData;
    const end = kstDate(now), start = daysBefore(end, 29);
    const words = new Map(db.words.map(word => [word.id, word]));
    const groups = new Map<string, { cefr: string; pos: string; attempts: number; wrong: number; hint: number }>();
    let sampleSize = 0;
    for (const log of db.studyLogs) {
      const answeredDate = kstDate(new Date(log.answeredAt));
      if (log.attempt !== 1 || answeredDate < start || answeredDate > end) continue;
      const word = words.get(log.wordId);
      if (!word) continue;
      sampleSize += 1;
      const key = `${word.cefr}:${word.pos}`;
      const group = groups.get(key) ?? { cefr: word.cefr, pos: word.pos, attempts: 0, wrong: 0, hint: 0 };
      group.attempts += 1;
      if (!log.isCorrect) group.wrong += 1;
      if (log.hintUsed) group.hint += 1;
      groups.set(key, group);
    }
    const weaknesses = [...groups.values()].filter(group => group.attempts >= 2)
      .map(group => ({ ...group, accuracy: Math.round((group.attempts - group.wrong) / group.attempts * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong || b.attempts - a.attempts)
      .slice(0, 3);
    const speakingCorrections = (db.speakingSessions ?? [])
      .filter(session => session.finishedAt && kstDate(new Date(session.finishedAt)) >= start && kstDate(new Date(session.finishedAt)) <= end)
      .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
      .flatMap(session => (session.summary?.corrections ?? []).map(item => ({ ...item, at: session.finishedAt! })))
      .slice(0, 3);
    return {
      sampleSize,
      insufficientData: sampleSize < 5,
      weaknesses,
      speakingCorrections,
      recommendationKo: sampleSize < 5
        ? '학습 기록이 더 쌓이면 자주 틀리는 수준과 품사를 알려드릴게요.'
        : weaknesses.length && weaknesses[0].wrong > 0
          ? `${weaknesses[0].cefr} ${weaknesses[0].pos} 단어를 먼저 복습해 보세요.`
          : '최근 30일의 첫 답안 정답률이 안정적이에요. 다음 수준의 단어를 시도해 보세요.',
    };
  }

  cost() { return monthlyCost(this.store.snapshot()); }
}
