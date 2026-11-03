# Mobile design review — 2026-11-04

The current PWA was inspected as 390 × 844 mobile Chromium screenshots for level check, home, study card, quiz, speaking home, conversation, summary empty state, records, and settings. This is a browser review; iPhone Safari, VoiceOver, and real microphone/TTS remain device gates.

## Direction

The product is a personal English practice companion. The visual direction keeps a quiet, readable study surface and gives the speaking entry a more recognizable set of conversation contexts. The token system remains warm off-white `#FAFAF7`, white `#FFFFFF`, ink `#1A1A1A`, learning indigo `#4F46E5`, soft indigo `#EEF2FF`, and restrained green `#16A34A`. Apple system typography is used on iPhone; headings are strong and short, while Korean guidance uses comfortable line height. Touch targets remain at least about 44 px where possible.

## Findings and changes

| Screen | Observation | Change |
| --- | --- | --- |
| Speaking home | Six different scenarios used the same generic chat icon, and every scenario card had identical weight. | Added a distinct contextual icon and soft tint for each scenario; featured the first practical café situation across the grid. |
| Empty speaking summary | A direct route showed a large blank page with no useful next action. | Added a concise explanation and a button back to conversation situations. |
| Interaction states | Mouse/touch styling existed, but keyboard focus and reduced-motion treatment were inconsistent. | Added visible focus outlines and disabled decorative transitions when reduced motion is requested. |
| Home and learning | The page hierarchy, content legibility, card flip, and primary action were clear at 390 px. | Kept the functional layout. |
| Records and settings | Both are dense, but content is readable through normal vertical scrolling. | Retained the structure for this pass; real iPhone safe-area and VoiceOver review remains. |

## Verification and limits

The latest `npm test` and production build pass. `npm run test:full` covers the 24-question level test, study, quiz, coaching summary, saved expression lifecycle, cost display, continuous listening, and real Chromium MediaRecorder with a fake microphone. `npm run test:app` passes direct navigation, visible CTAs, no runtime errors, and no horizontal overflow across 10 routes at 375 × 844, 390 × 844, and 430 × 844. The AI provider tests use mocks and do not verify live voice quality or actual cost. The public Vercel URL was not reachable from this restricted environment, and no physical iPhone test was performed.
