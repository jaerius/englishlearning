import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, isApiConfigured, ApiError, type ServerSettings, type ServerWord, type StudyAnswer, type StudyQuiz, type StudyResult, type WeeklyStat } from './api';
import type { Word } from './data';
import { localWords, localQuiz, localMetrics, localResult, nextProgress, selectNewWords, kstDay, type LocalDaily, type LocalProgress, type LocalSession } from './local-learning';
import { defaultLearningSettings, normalizeSettings, type LearningSettings } from './settings-normalize';

export type Settings = LearningSettings;
type SyncStatus = 'connecting' | 'online' | 'offline' | 'local';
type State = {
  settings: Settings; streak: number; studied: number; dueCount: number; masteredCount: number;
  aiTurns: number; weeklyAccuracy: number; weekly: WeeklyStat[]; cards: Word[];
  testAnswers: number[]; wrongIds: string[]; syncStatus: SyncStatus; syncMessage: string;
  sessionId: string | null; quizQueue: StudyQuiz[]; newWords: Word[]; lastResult: StudyResult | null;
  pendingAnswers: StudyAnswer[]; localProgress: LocalProgress; localDaily: LocalDaily; localSession: LocalSession | null;
  bootstrap: () => Promise<void>; setSettings: (p: Partial<Settings>) => void; setTest: (scores: number[]) => void;
  startStudy: (kind?: 'daily' | 'review', wordIds?: string[]) => Promise<void>;
  answer: (id: string, ok: boolean, hintUsed?: boolean) => Promise<void>;
  finishStudy: () => Promise<void>; flushPending: () => Promise<void>; reset: () => void;
};
const initial = defaultLearningSettings;
const toSettings = (value: ServerSettings, voiceName = ''): Settings => normalizeSettings({ level: value.userLevel, dailyNew: value.dailyNewCount, reviewCap: value.reviewCap, ttsRate: value.ttsRate, voiceName, sound: value.soundOn, autoplay: value.ttsAutoplay, autoSend: value.speakAutoSend, targetWords: value.useTargetWords });
const toServer = (value: Partial<Settings>): Partial<ServerSettings> => {
  const result: Partial<ServerSettings> = {};
  if (value.level !== undefined) result.userLevel = value.level;
  if (value.dailyNew !== undefined) result.dailyNewCount = value.dailyNew;
  if (value.reviewCap !== undefined) result.reviewCap = value.reviewCap;
  if (value.ttsRate !== undefined) result.ttsRate = value.ttsRate;
  if (value.sound !== undefined) result.soundOn = value.sound;
  if (value.autoplay !== undefined) result.ttsAutoplay = value.autoplay;
  if (value.autoSend !== undefined) result.speakAutoSend = value.autoSend;
  if (value.targetWords !== undefined) result.useTargetWords = value.targetWords;
  return result;
};
const toWord = (word: ServerWord, stage = 0, wrong = 0): Word => ({ id: word.id, word: word.word, meaning: word.meaningKo, pos: word.pos, example: word.exampleEn, translation: word.exampleKo, level: word.level, stage, wrong, spokenExampleEn: word.spokenExampleEn, writtenExampleEn: word.writtenExampleEn, usageNoteKo: word.usageNoteKo });
const localCards = (progress: LocalProgress) => localWords.map(word => ({ ...word, stage: progress[word.id]?.stage ?? 0, wrong: progress[word.id]?.wrongCount ?? 0 }));
const localView = (progress: LocalProgress, daily: LocalDaily) => ({ ...localMetrics(progress, daily), cards: localCards(progress), aiTurns: 0 });

export const useApp = create<State>()(persist((set, get) => ({
  settings: initial, streak: 0, studied: 0, dueCount: 0, masteredCount: 0, aiTurns: 0,
  weeklyAccuracy: 0, weekly: [], cards: localWords, testAnswers: [], wrongIds: [],
  syncStatus: isApiConfigured ? 'connecting' : 'local',
  syncMessage: isApiConfigured ? '서버에 연결하는 중이에요' : '이 기기에 학습 기록을 저장해요 · 서버 동기화는 꺼져 있어요',
  sessionId: null, quizQueue: [], newWords: [], lastResult: null, pendingAnswers: [],
  localProgress: {}, localDaily: {}, localSession: null,

  bootstrap: async () => {
    const { localProgress, localDaily } = get();
    set(localView(localProgress, localDaily));
    if (!isApiConfigured) return;
    set({ syncStatus: 'connecting', syncMessage: '학습 데이터를 불러오는 중이에요' });
    try {
      const [settings, summary, wrongNotes, serverWords, weekly] = await Promise.all([api.settings(), api.summary(), api.wrongNotes(), api.words(), api.weekly()]);
      const progress = new Map(wrongNotes.map(item => [item.word.id, item.progress]));
      set(state => ({
        settings: toSettings(settings, state.settings.voiceName), streak: summary.streak,
        studied: summary.today.studiedCount, dueCount: summary.today.dueCount,
        masteredCount: summary.masteredCount, aiTurns: summary.today.aiTurns,
        weeklyAccuracy: summary.weeklyAccuracy, weekly, wrongIds: wrongNotes.map(item => item.word.id),
        cards: serverWords.map(word => toWord(word, progress.get(word.id)?.stage, progress.get(word.id)?.wrongCount)),
        syncStatus: 'online', syncMessage: '서버와 동기화됨',
      }));
      await get().flushPending();
    } catch (error) {
      set({ ...localView(get().localProgress, get().localDaily), syncStatus: 'offline',
        syncMessage: error instanceof Error ? `서버 연결 실패 · 이 기기에만 저장 중 (${error.message})` : '서버 연결 실패 · 이 기기에만 저장 중' });
    }
  },

  setSettings: value => {
    set(state => ({ settings: { ...state.settings, ...value } }));
    if (isApiConfigured && get().syncStatus === 'online') {
      void api.updateSettings(toServer(value)).then(server => set(state => ({ settings: toSettings(server, state.settings.voiceName) })))
        .catch(() => set({ syncStatus: 'offline', syncMessage: '설정은 이 기기에 저장했어요. 서버 연결을 확인해 주세요.' }));
    }
  },
  setTest: scores => set({ testAnswers: scores }),

  startStudy: async (kind = 'daily', wordIds) => {
    if (isApiConfigured && get().syncStatus === 'online') {
      try {
        const [session, serverWords] = await Promise.all([api.startStudy(kind, wordIds), api.words()]);
        const cards = serverWords.map(word => toWord(word));
        set({ sessionId: session.sessionId, localSession: null, lastResult: null,
          quizQueue: session.quizQueue, newWords: session.newWords.map(word => toWord(word)),
          cards: cards.length ? cards : get().cards, syncStatus: 'online', syncMessage: '학습 세션을 시작했어요' });
        return;
      } catch (error) {
        set({ syncStatus: 'offline', syncMessage: error instanceof Error ? `서버 연결 실패 · 이 기기에만 저장 중 (${error.message})` : '서버 연결 실패 · 이 기기에만 저장 중' });
      }
    }
    const state = get(), progress = state.localProgress, today = kstDay();
    const due = localWords.filter(word => progress[word.id]?.nextReviewAt <= today)
      .sort((a, b) => progress[a.id].nextReviewAt.localeCompare(progress[b.id].nextReviewAt))
      .slice(0, state.settings.reviewCap);
    const selected = wordIds?.length
      ? localWords.filter(word => wordIds.includes(word.id) && progress[word.id])
      : due;
    const newWords = kind === 'daily' && !wordIds?.length
      ? selectNewWords(progress, state.settings.level, state.settings.dailyNew)
      : [];
    const unique = [...new Map([...selected, ...newWords].map(word => [word.id, word])).values()];
    const id = `local-${crypto.randomUUID()}`;
    const session: LocalSession = { id, wordIds: unique.map(word => word.id), firstAnswers: {}, attempts: {}, wrongIds: [] };
    set({ sessionId: id, localSession: session, lastResult: null, quizQueue: unique.map(word => localQuiz(word, progress[word.id]?.stage ?? 0)),
      newWords, cards: localCards(progress), syncStatus: isApiConfigured ? 'offline' : 'local',
      syncMessage: isApiConfigured ? '이 학습은 기기에만 저장돼요 · 서버와 자동 병합되지 않아요' : '이 기기에 학습 기록을 저장해요 · 서버 동기화는 꺼져 있어요' });
  },

  answer: async (id, ok, hintUsed = false) => {
    const current = get();
    const session = current.localSession;
    if (session && current.sessionId === session.id) {
      const attempts = session.attempts[id] ?? 0;
      if (attempts >= 2 || (attempts === 1 && session.firstAnswers[id])) return;
      const nextSession: LocalSession = { ...session, attempts: { ...session.attempts, [id]: attempts + 1 } };
      if (attempts === 0) {
        nextSession.firstAnswers = { ...session.firstAnswers, [id]: ok };
        if (!ok) nextSession.wrongIds = [...session.wrongIds, id];
        const progress = { ...current.localProgress, [id]: nextProgress(current.localProgress[id], ok, hintUsed) };
        set({ localSession: nextSession, localProgress: progress, ...localView(progress, current.localDaily) });
      } else set({ localSession: nextSession });
      return;
    }
    if (!current.sessionId || !isApiConfigured) return;
    const quiz = current.quizQueue.find(item => item.wordId === id);
    const payload: StudyAnswer = { sessionId: current.sessionId, wordId: id, quizType: quiz?.type || 'A', isCorrect: ok, hintUsed };
    try { await api.answer(payload); }
    catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.message.includes('ANSWER_ALREADY_SUBMITTED')) return;
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        set({ syncStatus: 'offline', syncMessage: `답안 저장 오류 · ${error.message}` }); return;
      }
      set(state => ({ pendingAnswers: [...state.pendingAnswers, payload], syncStatus: 'offline', syncMessage: '답안을 기기에 보관했어요. 연결되면 전송해요.' }));
    }
  },

  finishStudy: async () => {
    const current = get(), id = current.sessionId;
    if (!id) return;
    if (current.localSession?.id === id) {
      const result = localResult(current.localSession), today = kstDay();
      const previous = current.localDaily[today] ?? { studiedCount: 0, correctCount: 0, sessionCount: 0 };
      const daily = { ...current.localDaily, [today]: {
        studiedCount: previous.studiedCount + result.totalCount,
        correctCount: previous.correctCount + result.correctCount,
        sessionCount: previous.sessionCount + Number(result.totalCount > 0),
      } };
      set({ ...localView(current.localProgress, daily), localDaily: daily, localSession: null,
        sessionId: null, lastResult: result });
      return;
    }
    if (!isApiConfigured) return;
    try {
      await get().flushPending();
      if (get().pendingAnswers.length) throw new Error('전송 대기 답안이 남아 있어요.');
      const result = await api.finishStudy(id);
      set({ sessionId: null, lastResult: result, syncStatus: 'online', syncMessage: '학습 결과를 저장했어요' });
      await get().bootstrap();
    } catch {
      set({ syncStatus: 'offline', syncMessage: '학습 결과는 연결되면 저장돼요' });
    }
  },

  flushPending: async () => {
    const queue = [...get().pendingAnswers];
    for (const item of queue) {
      try { await api.answer(item); set(state => ({ pendingAnswers: state.pendingAnswers.filter(answer => answer !== item) })); }
      catch (error) {
        if (error instanceof ApiError && error.status === 400 && error.message.includes('ANSWER_ALREADY_SUBMITTED')) {
          set(state => ({ pendingAnswers: state.pendingAnswers.filter(answer => answer !== item) })); continue;
        }
        return;
      }
    }
  },
  reset: () => set({ settings: initial, streak: 0, studied: 0, dueCount: 0, masteredCount: 0, aiTurns: 0,
    weeklyAccuracy: 0, weekly: [], cards: localWords, testAnswers: [], wrongIds: [], sessionId: null,
    quizQueue: [], newWords: [], lastResult: null, pendingAnswers: [], localProgress: {}, localDaily: {}, localSession: null }),
}), { name: 'lingo-loop-v5', merge: (persisted, current) => {
  const saved = persisted && typeof persisted === 'object' ? persisted as Partial<State> : {};
  return { ...current, ...saved, settings: normalizeSettings(saved.settings) };
}, partialize: state => ({ settings: state.settings, pendingAnswers: state.pendingAnswers,
  sessionId: state.sessionId, quizQueue: state.quizQueue, newWords: state.newWords,
  localProgress: state.localProgress, localDaily: state.localDaily, localSession: state.localSession,
  testAnswers: state.testAnswers }) }));
