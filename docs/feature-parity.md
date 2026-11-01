# Feature parity and acceptance status

Parity means independently delivering the learner's task, not copying Speak or WordVoca assets, wording, layout, or code. Publicly observed concepts and inferences are tracked in `competitor-analysis.md`.

| Learner task | Current web implementation | Acceptance condition | Status |
| --- | --- | --- | --- |
| Open on iPhone | Vite bundle builds | Public or user-accessible HTTPS URL opens on a physical iPhone | Unverified |
| Converse without touching screen every turn | Browser speech recognition option | 10-minute multi-turn real-device test with interruption recovery | Unverified; current UI lacks a robust turn loop |
| Receive useful speaking feedback | Fixed response template and browser TTS | Diverse utterances receive relevant correction and next prompt | Not implemented |
| Save a voice note | MediaRecorder to IndexedDB | Recording survives reload and browser restart on iPhone | Implemented in code; device test pending |
| Remove recordings after three days | Prune on next app open | Expired Blob removed on reopen and clearly described to users | Implemented in code; device test pending |
| Build vocabulary collection | Three sample cards | Add, edit, search, delete, import/export original or licensed content | Not implemented |
| Study at appropriate intervals | `ts-fsrs` FSRS-7 per-card state | Review logs persist and reference cases pass | Partial; library review call checked, logs and migration unfinished |
| Keep paid API below KRW 5,000/month | No paid API use | Metered production usage and server-enforced cap | Current code: KRW 0; production budget unverified |
| Resume reliably | localStorage and IndexedDB | Versioned migrations, recovery, backup/export | Not implemented |

The current app is a working code prototype where built and tested, not a production release or full competitor parity.
