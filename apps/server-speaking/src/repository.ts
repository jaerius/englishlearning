import type { Scenario, SpeakingSession } from "./types.js";

export class InMemorySpeakingRepository {
  readonly scenarios = new Map<string, Scenario>();
  readonly sessions = new Map<string, SpeakingSession>();
  readonly turnsByKstDay = new Map<string, number>();
  saveScenario(item: Scenario) { this.scenarios.set(item.id, structuredClone(item)); }
  saveSession(item: SpeakingSession) { this.sessions.set(item.id, structuredClone(item)); }
  getSession(id: string) { const item = this.sessions.get(id); return item ? structuredClone(item) : undefined; }
  getScenario(id: string) { const item = this.scenarios.get(id); return item ? structuredClone(item) : undefined; }
}

export function kstDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
