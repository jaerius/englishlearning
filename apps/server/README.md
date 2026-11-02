# Lingo Loop API

NestJS M1–M4 API for the product specification. Run `npm install`, `npm test`, `npm run build`, then `npm run dev`. The API is served under `/api` and defaults to port 3001.

Persistence currently uses an atomically replaced JSON file at `data/lingo-loop.json` (override with `DATA_FILE`). This is an intentional development fallback because the requested SQLite driver requires native install scripts. The repository/service boundary keeps a later SQLite/TypeORM replacement isolated, but this fallback is not suitable for multiple processes or concurrent writers.

Implemented: health, words, settings, 20-question level test, daily/review session construction, stage-based A/B/C quiz generation, one retry after a wrong answer, answer/SRS updates, session finish, due reviews (including mastered words whose 60-day date has arrived), wrong notes, reset-to-unknown, `flaggedUnknown` updates, summary and weekly stats. The single seed source is the 60 original entries in `packages/content`; the planned licensed 3,000-word dataset is not included.

Update the unknown flag with `PATCH /api/user-words/:wordId` and JSON body `{ "flaggedUnknown": true }` (or `false`). Reset progress with the same route and `?action=reset`.
