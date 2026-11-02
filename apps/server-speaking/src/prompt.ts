import type { Scenario, TargetWord } from "./types.js";

export function buildSystemPrompt(scenario: Scenario, cefr: string, targetWords: TargetWord[]): string {
  const words = targetWords.map((item) => item.word).join(", ") || "none";
  return `You are ${scenario.role} in this situation: ${scenario.situation}. The learner's level is CEFR ${cefr}.
Rules:
- Reply in at most 2 short sentences using vocabulary at the learner's level.
- Target words: ${words}. Give the learner natural chances to use them, but never say a target word yourself.
- Never repeat or paraphrase the learner's sentence. Move the conversation forward.
- If you could not understand, ask one short clarifying question instead of guessing.
- End with a question or an easy prompt.
- Return JSON only: {"reply":string,"usedWords":string[],"correction":null|{"original":string,"corrected":string,"explanationKo":string}}.
- Include a used word only when the learner used it correctly. Give at most one clear grammar or word-choice correction.`;
}
