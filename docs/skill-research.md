# Skill research — 2026-11-02

## Scope and method

The three named public GitHub repositories were cloned to `/tmp` and sampled at the commits below. Their `SKILL.md` files, executable-looking files, manifests, and references to credentials or subprocesses were searched. This is a **partial static review**, not a comprehensive audit of every script and dependency. No downloaded skill script was run. The user set a two-hour maximum, but this research did not consume or complete two hours. X was not queried because the environment's restricted egress policy does not include `x.com`; that is not evidence that relevant X posts do not exist.

`rea-agents` was not supplied as a resolvable repository URL. The meaning of “REA” was also not defined by the user or any inspected local source. We cannot honestly claim a specific REA framework or agent method was followed. For this project, the research process is recorded as an **evidence ledger → requirements → architecture → acceptance checks**, without claiming that this expands the REA acronym. A concrete source URL or definition is needed before installing or claiming compliance with a named REA tool.

## Comparison

| Candidate | Maintenance signal | Codex / project fit | Security and permissions | Cost | Decision |
| --- | --- | --- | --- | --- | --- |
| [expo/skills](https://github.com/expo/skills) | Official Expo source; inspected `05754e7` (2026-10-28) | Good for Expo; low relevance now that delivery target is web | Inspected CI helper references token-scoped private harnesses and `npx`; do not run it or give credentials. EAS/iOS credentials were not invoked. | Guidance free; EAS/cloud use can cost money | Do not install for the web delivery target. |
| [replica-skill](https://github.com/Jakeschincariol/replica-skill) | Inspected `77c9436` (2026-10-03) | Useful clean-room reconstruction checklist; less Expo-specific | `replica-build` stresses fresh code, original assets/copy exclusion, and feature states. No install script found in the inspected surface. | Free | Its clean-room rules are adopted in docs; skill itself is not needed at runtime. |
| [appllama-skills](https://github.com/Appllama/appllama-skills) | Inspected `dd5caae` (2026-09-06) | Native design guidance; limited web fit | It assumes an optional Appllama MCP and research access unavailable here. No provider credentials were requested. | Provider cost not established | Do not install for the web delivery target. |
| rea-agents | Unresolved name | Cannot assess | Cannot assess scripts, dependencies, or permissions without source | Unknown | Rejected pending an exact public URL. |

## Chosen smallest set

No third-party skill has been installed into `.agents/skills/`. The local `expo-local` file is an original project instruction from the earlier Expo experiment; it is obsolete for the current web delivery target and should be removed or rewritten by the implementation owner. The three inspected candidates do not justify copying executable material or credentials into this project. `replica-build` clean-room principles can be applied without installing its Claude-oriented skill.

## Public sources consulted

- The three GitHub repositories linked above, inspected from local clones at the stated commits.
- `speak.com`, `wordvoca.com`, and the Speak App Store URL were attempted and blocked by proxy HTTP 403. They are **not consulted sources**.
- Official Expo and FSRS URLs named in earlier versions were not directly opened in this research pass. They are pointers for later verification, not evidence.

No API keys, Apple credentials, Expo tokens, microphone permissions, remote scripts, or external agent tools were granted access during research.
