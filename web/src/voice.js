/**
 * Best-effort foreground voice turns for browsers implementing Web Speech.
 * The caller supplies a reply policy; this module never calls a paid API.
 * Browsers may end recognition at any time or refuse an automatic restart.
 */
export function createVoiceController({
  getReply,
  onState = () => {},
  onTranscript = () => {},
  onError = () => {},
  speechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
}) {
  let phase = 'idle';
  let active = false;
  let generation = 0;
  let recognizer = null;
  let speaking = null;
  let stopReason = null;

  const state = (next) => { phase = next; onState(next); };
  const fail = (message) => {
    active = false;
    generation += 1;
    recognizer = null;
    speaking = null;
    state('error');
    onError(message);
  };

  function listen(token) {
    if (!active || token !== generation) return;
    if (!speechRecognition) return fail('이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트 입력을 사용해 주세요.');
    let instance;
    try { instance = new speechRecognition(); }
    catch { return fail('음성 인식을 준비하지 못했습니다.'); }
    recognizer = instance;
    stopReason = null;
    instance.lang = 'en-US';
    instance.continuous = false; // A turn ends at a final utterance.
    instance.interimResults = true;
    instance.onresult = (event) => {
      if (token !== generation || !active) return;
      const transcript = Array.from(event.results || [], result => result[0]?.transcript || '').join(' ').trim();
      onTranscript(transcript);
      const last = event.results?.[event.results.length - 1];
      if (last?.isFinal && transcript && stopReason !== 'turn') {
        stopReason = 'turn';
        instance.__finalTranscript = transcript;
        state('processing');
        try { instance.stop(); } catch { turn(transcript, token); return; }
        // Some engines never emit `end` after a final result. Guard the turn.
        setTimeout(() => {
          if (active && token === generation && stopReason === 'turn' && recognizer === instance) {
            recognizer = null;
            turn(transcript, token);
          }
        }, 1200);
      }
    };
    instance.onerror = (event) => {
      if (token !== generation || !active || stopReason === 'turn') return;
      fail(`음성 인식 오류: ${event?.error || 'unknown'}`);
    };
    instance.onend = () => {
      if (token !== generation || !active || recognizer !== instance) return;
      recognizer = null;
      if (stopReason === 'turn' && instance.__finalTranscript) {
        const transcript = instance.__finalTranscript;
        stopReason = null;
        turn(transcript, token);
      } else if (phase === 'listening') {
        fail('브라우저가 듣기를 종료했습니다. 다시 시작 버튼을 눌러 주세요.');
      }
    };
    try { instance.start(); state('listening'); }
    catch { fail('마이크를 시작하지 못했습니다. Safari 권한을 확인해 주세요.'); }
  }

  async function turn(transcript, token) {
    if (!active || token !== generation) return;
    state('processing');
    let response;
    try { response = await getReply(transcript); }
    catch { return fail('응답을 만들지 못했습니다. 다시 시작해 주세요.'); }
    if (!active || token !== generation) return;
    const reply = typeof response === 'string' ? { text: response, lang: 'en-US' } : response;
    if (!reply?.text?.trim()) return fail('빈 응답을 받았습니다.');
    if (!synthesis || !Utterance) return fail('이 브라우저는 음성 재생을 지원하지 않습니다.');
    const utterance = new Utterance(reply.text);
    utterance.lang = reply.lang || 'en-US';
    speaking = utterance;
    utterance.onend = () => {
      if (!active || token !== generation || speaking !== utterance) return;
      speaking = null;
      // Some browsers require a fresh gesture and will reject this restart.
      listen(token);
    };
    utterance.onerror = () => fail('음성 재생이 중단됐습니다. 다시 시작해 주세요.');
    try { state('speaking'); synthesis.speak(utterance); }
    catch { fail('음성을 재생하지 못했습니다.'); }
  }

  return {
    get phase() { return phase; },
    get supported() { return Boolean(speechRecognition && synthesis && Utterance); },
    start() {
      if (active) return;
      active = true;
      const token = ++generation;
      listen(token);
    },
    stop() {
      active = false;
      generation += 1;
      stopReason = 'manual';
      const previous = recognizer;
      recognizer = null;
      speaking = null;
      try { previous?.stop(); } catch { /* Already ended. */ }
      try { synthesis?.cancel(); } catch { /* Audio subsystem unavailable. */ }
      state('idle');
    },
  };
}
