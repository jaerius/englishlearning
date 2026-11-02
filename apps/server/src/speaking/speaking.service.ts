import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { kstDate } from '../common/date.js';
import type { Database, DailyStat } from '../common/models.js';
import { StoreService } from '../common/store.service.js';
import { CreateCustomScenarioDto, RepeatCheckDto, SavePhraseDto, SpeakingTurnDto, StartSpeakingSessionDto } from './speaking.dto.js';
import type { SpeakingData, SpeakingScenario, SpeakingSession } from './speaking.models.js';
import { SpeakingProvider } from './speaking.provider.js';
import { DEFAULT_SCENARIOS } from './speaking.scenarios.js';
import { calcNext } from '../review/srs.js';

type SpeakingDatabase = Database & SpeakingData;

@Injectable()
export class SpeakingService {
  constructor(private readonly store: StoreService, private readonly provider: SpeakingProvider) {}

  phrases() {
    return (this.store.snapshot().savedPhrases ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async savePhrase(input: SavePhraseDto) {
    return this.store.update(db => {
      db.savedPhrases ??= [];
      const phrase = input.phrase.trim(), meaningKo = input.meaningKo.trim();
      const existing = db.savedPhrases.find(item => item.phrase.toLocaleLowerCase('en-US') === phrase.toLocaleLowerCase('en-US'));
      if (existing) return existing;
      const saved = { id: randomUUID(), phrase, meaningKo, savedAt: new Date().toISOString() };
      db.savedPhrases.push(saved);
      return saved;
    });
  }

  async deletePhrase(id: string) {
    return this.store.update(db => {
      const index = (db.savedPhrases ?? []).findIndex(item => item.id === id);
      if (index < 0) throw new NotFoundException({ code: 'PHRASE_NOT_FOUND', message: '저장한 표현을 찾을 수 없습니다.' });
      db.savedPhrases!.splice(index, 1);
      return { deleted: true };
    });
  }

  scenarios(): SpeakingScenario[] {
    return this.allScenarios(this.store.snapshot() as SpeakingDatabase);
  }

  recent() {
    const db = this.store.snapshot() as SpeakingDatabase;
    const scenarios = this.allScenarios(db);
    return (db.speakingSessions ?? []).filter(session => session.finishedAt && session.summary)
      .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
      .slice(0, 3).map(session => ({ id: session.id, title: scenarios.find(item => item.id === session.scenarioId)?.title ?? '영어 대화', finishedAt: session.finishedAt, turns: session.messages.filter(message => message.role === 'user').length, summary: session.summary }));
  }

  targetWords() {
    const db = this.store.snapshot();
    return db.userWords.filter(progress => progress.lastStudiedAt && kstDate(new Date(progress.lastStudiedAt)) === kstDate())
      .sort((a, b) => (b.lastStudiedAt ?? '').localeCompare(a.lastStudiedAt ?? ''))
      .slice(0, 3).flatMap(progress => { const word = db.words.find(item => item.id === progress.wordId); return word ? [{ id: word.id, word: word.word, meaningKo: word.meaningKo }] : []; });
  }

  async createCustom(input: CreateCustomScenarioDto): Promise<SpeakingScenario> {
    const generated = await this.provider.createScenario(input.text.trim(), input.level);
    const scenario: SpeakingScenario = { ...generated, id: randomUUID(), isCustom: true };
    await this.store.update((raw) => {
      const db = raw as SpeakingDatabase;
      this.ensureCollections(db);
      db.speakingScenarios!.push(scenario);
    });
    return scenario;
  }

  async start(input: StartSpeakingSessionDto): Promise<SpeakingSession> {
    return this.store.update((raw) => {
      const db = raw as SpeakingDatabase;
      this.ensureCollections(db);
      if (!this.allScenarios(db).some((scenario) => scenario.id === input.scenarioId)) {
        throw new NotFoundException({ code: 'SCENARIO_NOT_FOUND', message: '대화 상황을 찾을 수 없습니다.' });
      }
      const requested = input.targetWords?.length ? input.targetWords : this.targetWords();
      const targetWords = requested.slice(0, 3).flatMap(target => {
        const word = db.words.find(item => item.id === target.id && item.word.toLocaleLowerCase('en-US') === target.word.toLocaleLowerCase('en-US'));
        return word && db.userWords.some(progress => progress.wordId === word.id) ? [{ id: word.id, word: word.word, meaningKo: word.meaningKo }] : [];
      });
      const session: SpeakingSession = {
        id: randomUUID(), scenarioId: input.scenarioId, cefr: input.cefr,
        targetWords, messages: [], usedWordIds: [],
        startedAt: new Date().toISOString(), finishedAt: null, summary: null,
      };
      db.speakingSessions!.push(session);
      return structuredClone(session);
    });
  }

  async turn(id: string, input: SpeakingTurnDto, now = new Date()) {
    const text = input.text.trim();
    if (!text) throw new BadRequestException({ code: 'EMPTY_TURN', message: '말하거나 입력한 내용이 없습니다.' });
    const reservation = await this.reserveTurn(id, now);

    let result: Awaited<ReturnType<SpeakingProvider['reply']>>;
    try {
      result = await this.provider.reply(text, reservation.targetWords, reservation.scenario, reservation.history, reservation.cefr);
    } catch (error) {
      await this.releaseTurn(reservation.date);
      throw error;
    }

    try {
      return await this.store.update((raw) => {
        const db = raw as SpeakingDatabase;
        const session = this.requireSession(db, id);
        if (session.finishedAt) throw new ConflictException({ code: 'SESSION_FINISHED', message: '이미 끝난 대화입니다.' });
        const createdAt = now.toISOString();
        session.messages.push({ id: randomUUID(), role: 'user', text, correction: result.correction, usedWords: result.usedWords, createdAt });
        session.messages.push({ id: randomUUID(), role: 'ai', text: result.reply, correction: null, usedWords: [], createdAt });
        for (const target of session.targetWords) {
          if (result.usedWords.some((word) => sameWord(word, target.word)) && !session.usedWordIds.includes(target.id)) session.usedWordIds.push(target.id);
        }
        const turnsUsed = db.dailyStats.find((stat) => stat.date === reservation.date)?.aiTurns ?? reservation.limit;
        return { userText: text, reply: result.reply, usedWords: result.usedWords, hasCorrection: Boolean(result.correction), turnsRemaining: Math.max(0, reservation.limit - turnsUsed) };
      });
    } catch (error) {
      await this.releaseTurn(reservation.date);
      throw error;
    }
  }

  async deleteLastTurn(id: string): Promise<{ deleted: true; usedWordIds: string[] }> {
    return this.store.update((raw) => {
      const db = raw as SpeakingDatabase;
      const session = this.requireSession(db, id);
      if (session.finishedAt) throw new ConflictException({ code: 'SESSION_FINISHED', message: '이미 끝난 대화입니다.' });
      let userIndex = -1;
      for (let index = session.messages.length - 1; index >= 0; index -= 1) {
        if (session.messages[index].role === 'user') { userIndex = index; break; }
      }
      if (userIndex < 0) throw new NotFoundException({ code: 'TURN_NOT_FOUND', message: '취소할 대화가 없습니다.' });
      session.messages.splice(userIndex);
      session.usedWordIds = session.targetWords.filter((target) => session.messages.some((message) => message.role === 'user' && message.usedWords.some((word) => sameWord(word, target.word)))).map((target) => target.id);
      return { deleted: true as const, usedWordIds: [...session.usedWordIds] };
    });
  }

  async finish(id: string, now = new Date()): Promise<SpeakingSession> {
    const current = this.requireSession(this.store.snapshot() as SpeakingDatabase, id);
    if (current.finishedAt) return structuredClone(current);
    const userTurns = current.messages.filter((message) => message.role === 'user').length;
    const summary = userTurns >= 3 ? await this.provider.summarize(current.messages, current.targetWords, current.usedWordIds) : null;
    return this.store.update((raw) => {
      const db = raw as SpeakingDatabase;
      const session = this.requireSession(db, id);
      if (!session.finishedAt) {
        session.finishedAt = now.toISOString(); session.summary = summary;
        const date = kstDate(now);
        for (const target of session.targetWords) {
          if (!session.usedWordIds.includes(target.id)) continue;
          const cleanUse = session.messages.some(message => message.role === 'user' && !message.correction && message.usedWords.some(word => sameWord(word, target.word)));
          if (!cleanUse) continue;
          const progress = db.userWords.find(item => item.wordId === target.id);
          if (!progress || progress.lastSpokenAt && kstDate(new Date(progress.lastSpokenAt)) === date) continue;
          const next = calcNext({ stage: progress.stage, isCorrect: true, hintUsed: false, now });
          progress.stage = next.nextStage; progress.nextReviewAt = next.nextReviewAt;
          progress.status = next.mastered ? 'mastered' : 'learning';
          progress.correctCount += 1; progress.spokenCount += 1; progress.lastSpokenAt = now.toISOString();
        }
      }
      return structuredClone(session);
    });
  }

  repeatCheck(input: RepeatCheckDto) {
    const expected = tokenize(input.reference), actual = tokenize(input.text);
    const matches = expected.filter((word, index) => word === actual[index]).length;
    const matchPercent = expected.length ? Math.round(matches / expected.length * 100) : 0;
    return { transcript: input.text, matchPercent, passed: matchPercent >= 80 };
  }

  async transcribe(id: string, audio: Buffer, mimeType: string) {
    const session = this.requireSession(this.store.snapshot() as SpeakingDatabase, id);
    if (session.finishedAt) throw new ConflictException({ code: 'SESSION_FINISHED', message: '이미 끝난 대화입니다.' });
    const date = kstDate();
    await this.store.update(db => {
      const stat = this.statFor(db, date), limit = db.settings.dailyAiTurnLimit;
      if ((stat.sttRequests ?? 0) >= limit || this.monthlyUsed(db, date, 'sttRequests') >= this.monthlyLimit()) {
        throw new HttpException({ code: 'STT_LIMIT', message: '오늘 또는 이번 달 음성 인식 한도에 도달했습니다.' }, HttpStatus.TOO_MANY_REQUESTS);
      }
      stat.sttRequests = (stat.sttRequests ?? 0) + 1;
    });
    try { return await this.provider.transcribe(audio, mimeType); }
    catch (error) { await this.store.update(db => { const stat = db.dailyStats.find(item => item.date === date); if (stat) stat.sttRequests = Math.max(0, (stat.sttRequests ?? 0) - 1); }); throw error; }
  }

  private async reserveTurn(id: string, now: Date) {
    return this.store.update((raw) => {
      const db = raw as SpeakingDatabase, session = this.requireSession(db, id);
      if (session.finishedAt) throw new ConflictException({ code: 'SESSION_FINISHED', message: '이미 끝난 대화입니다.' });
      const date = kstDate(now), stat = this.statFor(db, date), limit = db.settings.dailyAiTurnLimit;
      if (stat.aiTurns >= limit || this.monthlyUsed(db, date, 'aiTurns') >= this.monthlyLimit()) throw new HttpException({ code: 'AI_TURN_LIMIT', message: '오늘 또는 이번 달 AI 대화 한도에 도달했습니다.' }, HttpStatus.TOO_MANY_REQUESTS);
      stat.aiTurns += 1;
      const scenario = this.allScenarios(db).find(item => item.id === session.scenarioId);
      return { targetWords: structuredClone(session.targetWords), scenario, history: structuredClone(session.messages), cefr: session.cefr, date, limit };
    });
  }

  private allScenarios(db: SpeakingDatabase): SpeakingScenario[] {
    return [...DEFAULT_SCENARIOS, ...(db.speakingScenarios ?? []).filter((item) => item.isCustom)];
  }
  private requireSession(db: SpeakingDatabase, id: string): SpeakingSession {
    this.ensureCollections(db);
    const session = db.speakingSessions!.find((item) => item.id === id);
    if (!session) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: '대화 세션을 찾을 수 없습니다.' });
    return session;
  }
  private ensureCollections(db: SpeakingDatabase): void { db.speakingScenarios ??= []; db.speakingSessions ??= []; }
  private statFor(db: Database, date: string): DailyStat {
    let stat = db.dailyStats.find((item) => item.date === date);
    if (!stat) { stat = { date, studiedCount: 0, correctCount: 0, sessionCount: 0, aiTurns: 0 }; db.dailyStats.push(stat); }
    return stat;
  }
  private monthlyLimit(): number { const configured = Number(process.env.MONTHLY_AI_TURN_LIMIT || 600); return Number.isFinite(configured) ? Math.max(1, Math.floor(configured)) : 600; }
  private monthlyUsed(db: Database, date: string, key: 'aiTurns' | 'sttRequests'): number { return db.dailyStats.filter(item => item.date.startsWith(date.slice(0, 7))).reduce((sum, item) => sum + (item[key] ?? 0), 0); }
  private async releaseTurn(date: string): Promise<void> {
    await this.store.update((db) => { const stat = db.dailyStats.find((item) => item.date === date); if (stat) stat.aiTurns = Math.max(0, stat.aiTurns - 1); });
  }
}

function sameWord(left: string, right: string): boolean { return left.toLocaleLowerCase('en-US') === right.toLocaleLowerCase('en-US'); }
function tokenize(value: string): string[] { return value.toLocaleLowerCase('en-US').replace(/[^a-z0-9' ]/g, '').split(/\s+/).filter(Boolean); }
