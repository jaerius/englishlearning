import { ConfigurationError } from "./errors.js";
import type { ConversationSummary, Correction, Message, Scenario, SpeakingProvider, TargetWord } from "./types.js";

export class MockSpeakingProvider implements SpeakingProvider {
  async transcribe(audio: Uint8Array): Promise<string> {
    if (!audio.byteLength) throw new Error("Empty audio");
    return "I would like to practice English today.";
  }
  async reply(input: { userText: string; targetWords: TargetWord[] }): Promise<{ reply: string; usedWords: string[]; correction: Correction | null }> {
    const lower = input.userText.toLowerCase();
    const usedWords = input.targetWords.filter((item) => lower.includes(item.word.toLowerCase())).map((item) => item.word);
    return { reply: "That sounds interesting. What happened next?", usedWords, correction: null };
  }
  async summarize(messages: Message[], targetWords: TargetWord[], usedWordIds: string[]): Promise<ConversationSummary> {
    const corrections = messages.flatMap((item) => item.correction ? [item.correction] : []).slice(0, 5);
    return { corrections, expressions: [{ phrase: "That sounds interesting.", meaningKo: "흥미롭게 들리네요." }], targetWords: targetWords.map((item) => ({ id: item.id, word: item.word, used: usedWordIds.includes(item.id) })) };
  }
  async createScenario(text: string, level: number): Promise<Omit<Scenario, "id" | "isCustom">> {
    const safeLevel = Math.min(5, Math.max(1, Math.round(level))) as 1 | 2 | 3 | 4 | 5;
    return { title: text.slice(0, 40), description: "사용자가 만든 영어 대화 상황", level: safeLevel, role: "a helpful conversation partner", situation: text };
  }
}

/** Live provider boundary. The host application supplies HTTP clients so keys never enter this package or the browser. */
export class EnvironmentSpeakingProvider implements SpeakingProvider {
  constructor(private readonly env: Record<string, string | undefined>, private readonly delegate?: SpeakingProvider) {}
  private live(): SpeakingProvider {
    if (!this.env.OPENAI_API_KEY || !this.env.ANTHROPIC_API_KEY) throw new ConfigurationError("OPENAI_API_KEY와 ANTHROPIC_API_KEY를 서버 환경변수에 설정하세요.");
    if (!this.delegate) throw new ConfigurationError("실제 OpenAI/Anthropic HTTP 어댑터가 연결되지 않았습니다.");
    return this.delegate;
  }
  transcribe(audio: Uint8Array, mimeType: string) { return this.live().transcribe(audio, mimeType); }
  reply(input: Parameters<SpeakingProvider["reply"]>[0]) { return this.live().reply(input); }
  summarize(messages: Message[], targetWords: TargetWord[], usedWordIds: string[]) { return this.live().summarize(messages, targetWords, usedWordIds); }
  createScenario(text: string, level: number) { return this.live().createScenario(text, level); }
}
