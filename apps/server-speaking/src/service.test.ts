import assert from "node:assert/strict";
import test from "node:test";
import { LimitError } from "./errors.js";
import { MockSpeakingProvider } from "./providers.js";
import { InMemorySpeakingRepository, kstDateKey } from "./repository.js";
import { DEFAULT_SCENARIOS } from "./scenarios.js";
import { SpeakingService } from "./service.js";

test("seeds eight distinct scenarios", () => {
  const service = new SpeakingService(new InMemorySpeakingRepository(), new MockSpeakingProvider());
  assert.equal(service.scenarios().length, 8);
  assert.equal(new Set(DEFAULT_SCENARIOS.map((item) => item.id)).size, 8);
});

test("tracks target words and creates summary after three user turns", async () => {
  const service = new SpeakingService(new InMemorySpeakingRepository(), new MockSpeakingProvider());
  const session = service.start({ scenarioId: "cafe", cefr: "B1", targetWords: [{ id: "w1", word: "subtle", meaningKo: "미묘한" }] });
  await service.turn(session.id, { text: "The flavor is subtle." });
  await service.turn(session.id, { text: "I like this cafe." });
  await service.turn(session.id, { text: "Can I have another one?" });
  const finished = await service.finish(session.id);
  assert.deepEqual(finished.usedWordIds, ["w1"]);
  assert.equal(finished.summary?.targetWords[0]?.used, true);
});

test("enforces KST daily turn limit", async () => {
  const repository = new InMemorySpeakingRepository();
  const service = new SpeakingService(repository, new MockSpeakingProvider(), 1);
  const session = service.start({ scenarioId: "hotel", cefr: "A2" });
  const now = new Date("2026-11-01T16:00:00.000Z");
  assert.equal(kstDateKey(now), "2026-11-02");
  await service.turn(session.id, { text: "I have a reservation." }, now);
  await assert.rejects(() => service.turn(session.id, { text: "My name is Kim." }, now), LimitError);
});

test("deleting the latest turn removes its used-word credit", async () => {
  const service = new SpeakingService(new InMemorySpeakingRepository(), new MockSpeakingProvider());
  const session = service.start({ scenarioId: "small-talk", cefr: "B1", targetWords: [{ id: "w1", word: "curious", meaningKo: "호기심 많은" }] });
  await service.turn(session.id, { text: "I am curious about your work." });
  const reverted = service.deleteLastTurn(session.id);
  assert.equal(reverted.messages.length, 0);
  assert.deepEqual(reverted.usedWordIds, []);
});

test("repeat check compares normalized words", async () => {
  const service = new SpeakingService(new InMemorySpeakingRepository(), new MockSpeakingProvider());
  assert.deepEqual(await service.repeatCheck("Could I change my room?", { text: "Could I change my room" }), { transcript: "Could I change my room", matchPercent: 100, passed: true });
});
