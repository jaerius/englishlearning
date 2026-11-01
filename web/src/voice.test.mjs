import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceController } from './voice.js';

test('a turn stops recognition before speaking and restarts after speech ends', async () => {
  const events = [];
  const recognition = [];
  class Recognition {
    constructor() { recognition.push(this); }
    start() { events.push('listen'); }
    stop() { events.push('stop-listening'); this.onend?.(); }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const synthesis = { speak(utterance) { events.push('speak'); this.current = utterance; }, cancel() { events.push('cancel'); } };
  const controller = createVoiceController({
    speechRecognition: Recognition, synthesis, Utterance,
    getReply: async () => 'Hello again.',
  });
  controller.start();
  recognition[0].onresult({ results: [{ 0: { transcript: 'hello' }, isFinal: true }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events.slice(0, 3), ['listen', 'stop-listening', 'speak']);
  assert.equal(controller.phase, 'speaking');
  synthesis.current.onend();
  assert.equal(recognition.length, 2);
  assert.equal(controller.phase, 'listening');
  controller.stop();
  assert.equal(controller.phase, 'idle');
});

test('unsupported recognition reports a recoverable error', () => {
  let error = '';
  const controller = createVoiceController({ speechRecognition: null, synthesis: {}, Utterance: class {}, getReply: () => '', onError: value => { error = value; } });
  controller.start();
  assert.equal(controller.phase, 'error');
  assert.match(error, /지원하지 않습니다/);
});
