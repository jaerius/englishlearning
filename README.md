# Lingo Loop — web prototype

The current product is a Safari-compatible web prototype. It has not been deployed or tested on a physical iPhone.

Implemented: browser speech recognition when supported; text input fallback; local text-to-speech with simple rule-based feedback; three sample vocabulary cards with different review intervals; microphone recordings stored as Blobs in IndexedDB. Expired recordings are deleted when the app is opened after three days. Manual deletion is available.

This is not an AI conversation service. Review scheduling now calls `ts-fsrs` FSRS-7, but review-log persistence and real-device validation remain unfinished. Browser storage can be cleared by the user or operating system. iPhone microphone and speech recognition behavior still needs device testing.

Run `npm install`, `npm run web:build`, then `npm run web`. For iPhone testing, serve `dist/` from an HTTPS host; Safari microphone access requires a secure origin.

Vercel deployment is configured in `vercel.json`: install with `npm ci --ignore-scripts`, build with `npm run web:build`, publish `dist/`. The project has not been published or tested on an iPhone.
