# Competitor analysis: evidence ledger

## Status (2026-11-02, Korea time)

Direct requests to `speak.com`, `wordvoca.com`, and the cited Speak App Store page returned proxy HTTP 403. No screenshots, reviews, help pages, account walkthroughs, or user-provided references were available. Therefore **no specific Speak or WordVoca feature has been directly verified in this research pass**. The previous version of this document incorrectly implied those sources and reviews were read; that claim has been removed.

| Claim | Status | Evidence needed |
| --- | --- | --- |
| Speak offers live AI English conversation, feedback, pronunciation scoring, or scenarios | Unverified product hypothesis | Public listing/help page or authorized walkthrough and date of observation |
| WordVoca offers word lists, meanings, reminders, levels, or spaced review | Unverified product hypothesis | Identified official store listing, screenshots, help page, or authorized walkthrough |
| Either product uses particular ASR, LLM, TTS, or spaced repetition algorithm | Implementation inference only | Not obtainable from a UI observation; do not assert without published technical evidence |
| A hands-free learner flow needs microphone consent, listening state, interruption recovery, and accessible stop | Original product requirement | Validate through device tests, independent of competitor behavior |

## Clean-room product direction

The requested product combines spoken English practice and vocabulary review. Treat those as user requirements, not copied competitor features. Build original interaction, language, content, colors, and graphics. Do not copy third-party code, proprietary assets, or exact screen layouts.

Priority order from the user's requirements: (1) reliable iPhone access and voice capture/playback, (2) genuine multi-turn conversation with an explicit cost limit, (3) vocabulary CRUD and import with licensed/original content, (4) actual FSRS with review history, (5) polished accessible mobile UI. The current app has only a partial prototype of these capabilities; see [feature-parity.md](feature-parity.md).

## Next evidence collection

Once approved network access or authorized references are available, record for each source: URL or screenshot identifier, access date, exact visible feature, screen state, and confidence. Keep observations separate from implementation guesses. Test each competitor only through normal public or authorized user flows.
