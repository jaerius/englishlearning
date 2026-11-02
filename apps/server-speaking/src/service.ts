import { LimitError, NotFoundError, SpeakingError } from "./errors.js";
import { buildSystemPrompt } from "./prompt.js";
import { InMemorySpeakingRepository, kstDateKey } from "./repository.js";
import { DEFAULT_SCENARIOS } from "./scenarios.js";
import type { RepeatCheckResult, SpeakingProvider, SpeakingSession, StartSessionInput, TurnInput, TurnResult } from "./types.js";

export class SpeakingService {
  constructor(private readonly repository: InMemorySpeakingRepository, private readonly provider: SpeakingProvider, private readonly dailyTurnLimit = 40) {
    for (const scenario of DEFAULT_SCENARIOS) if (!repository.scenarios.has(scenario.id)) repository.saveScenario(scenario);
  }
  scenarios() { return [...this.repository.scenarios.values()]; }
  async createCustomScenario(text: string, level: number) {
    const clean = text.trim();
    if (!clean || clean.length > 200) throw new SpeakingError("INVALID_SCENARIO", "상황은 1~200자로 입력하세요.", 400);
    const generated = await this.provider.createScenario(clean, level);
    const scenario = { ...generated, id: crypto.randomUUID(), isCustom: true as const };
    this.repository.saveScenario(scenario); return scenario;
  }
  start(input: StartSessionInput): SpeakingSession {
    const scenario = this.repository.getScenario(input.scenarioId);
    if (!scenario) throw new NotFoundError("대화 상황을 찾을 수 없습니다.");
    const now = new Date().toISOString();
    const session: SpeakingSession = { id: crypto.randomUUID(), scenario, cefr: input.cefr, targetWords: (input.targetWords ?? []).slice(0, 3), messages: [], usedWordIds: [], startedAt: now, finishedAt: null, summary: null };
    this.repository.saveSession(session); return session;
  }
  async turn(sessionId: string, input: TurnInput, now = new Date()): Promise<TurnResult> {
    const session = this.session(sessionId); if (session.finishedAt) throw new SpeakingError("SESSION_FINISHED", "이미 끝난 대화입니다.", 409);
    const key = kstDateKey(now), used = this.repository.turnsByKstDay.get(key) ?? 0;
    if (used >= this.dailyTurnLimit) throw new LimitError();
    const userText = "text" in input ? input.text.trim() : await this.provider.transcribe(input.audio, input.mimeType);
    if (!userText) throw new SpeakingError("EMPTY_TURN", "말하거나 입력한 내용이 없습니다.", 400);
    const result = await this.provider.reply({ prompt: buildSystemPrompt(session.scenario, session.cefr, session.targetWords), messages: session.messages.slice(-20), userText, targetWords: session.targetWords });
    const nowIso = now.toISOString();
    session.messages.push({ id: crypto.randomUUID(), role: "user", text: userText, correction: result.correction, usedWords: result.usedWords, createdAt: nowIso });
    session.messages.push({ id: crypto.randomUUID(), role: "ai", text: result.reply, correction: null, usedWords: [], createdAt: nowIso });
    for (const target of session.targetWords) if (result.usedWords.some((word) => word.toLowerCase() === target.word.toLowerCase()) && !session.usedWordIds.includes(target.id)) session.usedWordIds.push(target.id);
    this.repository.turnsByKstDay.set(key, used + 1); this.repository.saveSession(session);
    return { userText, reply: result.reply, usedWords: result.usedWords, hasCorrection: Boolean(result.correction), turnsRemaining: this.dailyTurnLimit - used - 1 };
  }
  deleteLastTurn(sessionId: string) {
    const session = this.session(sessionId); const user = [...session.messages].reverse().find((item) => item.role === "user");
    if (!user) throw new NotFoundError("취소할 대화가 없습니다.");
    session.messages.splice(Math.max(0, session.messages.length - 2), 2);
    session.usedWordIds = session.targetWords.filter((target) => session.messages.some((message) => message.role === "user" && message.usedWords.some((word) => word.toLowerCase() === target.word.toLowerCase()))).map((item) => item.id);
    this.repository.saveSession(session); return session;
  }
  async finish(sessionId: string, now = new Date()) {
    const session = this.session(sessionId); if (session.finishedAt) return session;
    session.finishedAt = now.toISOString();
    const userTurns = session.messages.filter((item) => item.role === "user").length;
    session.summary = userTurns >= 3 ? await this.provider.summarize(session.messages, session.targetWords, session.usedWordIds) : null;
    this.repository.saveSession(session); return session;
  }
  async repeatCheck(reference: string, input: TurnInput): Promise<RepeatCheckResult> {
    const transcript = "text" in input ? input.text : await this.provider.transcribe(input.audio, input.mimeType);
    const expected = tokenize(reference), actual = tokenize(transcript); const matches = expected.filter((word, index) => word === actual[index]).length;
    const matchPercent = expected.length ? Math.round((matches / expected.length) * 100) : 0;
    return { transcript, matchPercent, passed: matchPercent >= 80 };
  }
  get(sessionId: string) { return this.session(sessionId); }
  private session(id: string) { const session = this.repository.getSession(id); if (!session) throw new NotFoundError("대화 세션을 찾을 수 없습니다."); return session; }
}

function tokenize(value: string) { return value.toLowerCase().replace(/[^a-z0-9' ]/g, "").split(/\s+/).filter(Boolean); }
