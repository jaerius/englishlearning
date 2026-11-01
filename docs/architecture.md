# Architecture and release decision

## Decision

The delivery target is an HTTPS web app usable in iPhone Safari without an Apple Developer account. The Vite app lives in `web/`. The abandoned Expo experiment was removed from the delivery tree because its native speech module cannot run inside Expo Go.

## Current boundaries

| Component | Current implementation | Production requirement |
| --- | --- | --- |
| Voice input | Browser `SpeechRecognition` with optional `continuous` flag | Test availability and session limits on each supported iOS version. Provide a visible recording state, permission recovery, interruption recovery, and a text fallback. `continuous: true` is a request to the browser, not a guarantee of an uninterrupted conversation. |
| Coaching | Deterministic phrase inserted into a fixed reply | Define a useful conversation policy, level progression, correction quality, moderation, and measurable acceptance criteria. If a hosted model is used, route requests through a backend with rate limits and private credentials. |
| Speech output | Browser `speechSynthesis` | Verify supported voices, audio focus, headphones, mute switch, and restart behavior on an actual iPhone. |
| Vocabulary | Three sample cards in localStorage | Licensed/author-created content, add/edit/search/import, schema migration, export/restore, and storage-failure handling. |
| Reviews | `ts-fsrs` FSRS-7 per-card scheduling with local persistence | Persist review logs, exercise known review histories, and validate migration. |
| Voice notes | `MediaRecorder` Blob in IndexedDB | Quota checks, duration/size limits, crash-safe writes, playback verification, and retention tests. Deletion happens when the app next opens; browser storage can also be evicted earlier. |

The app code does not upload notes. Browser speech recognition may use a platform speech service; on-device processing is not established by the Web Speech API. Do not claim that voice input remains on device until that is confirmed for supported iPhone/OS combinations. Microphone use requires HTTPS (or localhost).

## Voice architecture options

1. **Safari speech APIs:** no app-level paid API cost and no Apple Developer account. Suitable for a best-effort practice mode. Browser support, session termination, background behavior, and processing location remain device-dependent. This cannot guarantee continuous hands-free operation.
2. **Hosted speech and model service:** can provide more control over turn taking and feedback, but requires a backend, explicit privacy terms, server-side credentials, metering, and a quota. Unlimited continuous conversation is incompatible with a fixed low monthly cap unless measured usage proves otherwise.
3. **Native iOS app:** strongest control of audio sessions and device speech APIs; development distribution needs an Apple signing path and device testing. Revisit only if web limitations fail the product acceptance criteria.

## KRW 5,000 monthly paid-API guardrail

The current code makes zero paid API calls. This does not establish a production voice budget. For any hosted service, calculate `monthly_cost_KRW = users × sessions_per_user × minutes_per_session × (ASR_KRW_per_min + TTS_KRW_per_min) + model_input_tokens × input_rate + model_output_tokens × output_rate + hosting_KRW`. Record the provider's dated published prices and exchange rate, include tax/egress where applicable, and set a server-enforced hard monthly spend limit below KRW 5,000 with a reserve. When the limit is reached, the app must visibly switch to text/local practice. Do not put provider keys in the web bundle.

## Release gates

1. Choose a concrete target iPhone and iOS Safari version; validate speech permission, repeated turns, 10-minute session, interruptions, Bluetooth, silence, locking/backgrounding, and reconnection. Record pass/fail evidence.
2. Deploy the exact production bundle to HTTPS; test installation/bookmark behavior, asset loading, and reload from the iPhone. A successful Vite build alone is insufficient.
3. Test notes across reload and browser restart, deletion after expiry, manual deletion, quota failure, and accidental navigation while recording.
4. Test FSRS with known review histories and migration from current interval cards. Test content add/edit/import and export/restore.
5. Run accessibility checks for VoiceOver, Dynamic Type/zoom, focus, touch targets, and Korean/English labels; check privacy disclosures against observed browser behavior.
6. Only call it production-ready after real-device and hosted-path checks pass, costs are metered, and known critical bugs are closed.

## References

- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [MDN: MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [FSRS implementation and algorithm](https://github.com/open-spaced-repetition/fsrs4anki)
