# AGENT.md — FluentVoice (AI Speaking Coach)

Guidance for AI coding agents (and humans) working in this repository. Read this before changing anything.

## What this product is

A voice-first language-practice app. The user speaks; the browser transcribes; an AI partner replies over the OpenCode Go LLM; the reply is spoken back with browser TTS; each turn is analyzed in parallel for pronunciation, grammar, and vocabulary feedback. Feedback is **coaching layered on a real conversation** — never a quiz.

Non-negotiable product rules:

1. **Never fake measurements.** The browser Web Speech provider cannot measure phonemes. All pronunciation/grammar/vocabulary numbers are AI estimates and must be rendered with the `AI estimate` badge (`estimated: true` in the data model). Real provider-scored metrics set `estimated: false`.
2. **The API key never reaches the client.** All LLM calls go through Next.js route handlers under `app/api/*`. Client code may only call `/api/health` for status booleans.
3. **Microphone audio is transient.** Audio is never recorded to disk, never uploaded anywhere except the configured speech engine. Keep it that way.
4. **Conversation flow is sacred:** `idle → listening → processing → thinking → speaking → idle`. Analysis runs in parallel and must never block the reply or the voice.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript `strict` — no `any` escapes |
| Styling | Tailwind CSS v4 via CSS-first config (`app/globals.css` `@theme inline`). **No `tailwind.config.js`** |
| State | Zustand stores with `persist` (localStorage) in `lib/store/` |
| Validation | Zod v4 schemas in `lib/validation/schemas.ts` (shared by API routes and LLM output validation) |
| Icons | lucide-react |
| Storage | **localStorage only** — no database. (Postgres mirror was built then intentionally removed; re-add in Phase 3 with auth.) |
| LLM | OpenCode Go — OpenAI-compatible `POST {OPENCODE_BASE_URL}/v1/chat/completions`, Bearer auth, send `x-opencode-session` header |
| STT / TTS | Browser Web Speech APIs (free, pluggable) in `lib/speech/`; gender-preferring auto voice-pick (`voiceGender` setting) |

## Environment (`.env.local`, gitignored)

```
OPENCODE_API_KEY=          # from https://opencode.ai/auth → Go subscription
OPENCODE_BASE_URL=https://opencode.ai/zen/go
OPENCODE_MODEL=space-bunny-free
```

`lib/env.ts` is the only reader. Empty strings are treated as unset. Placeholder keys (`your-…`) make `isAIConfigured()` false, and the UI degrades to friendly "not configured" states — never crashes.

## Architecture map

```
app/
  page.tsx                     landing (server)
  onboarding/                 4-step wizard → creates session
  practice/                   scenario hub (resume/recent/custom topic)
  practice/[sessionId]/       immersive conversation screen (client)
  practice/word/[word]/       word pronunciation practice panel
  progress/                   streaks, averages, difficult words, activity bars
  settings/                   languages, voice, coaching frequency, theme, privacy
  api/
    conversation/             next AI reply (system prompt per scenario)
    analyze/                  after-turn JSON: scores, corrections, tricky words
    explain/                  "Explain in {native language}" for a correction
    word-profile/             IPA/syllables/stress/meaning/example for a word
    health/                   config booleans for status chips
lib/
  ai/                         provider abstraction
    types.ts                  LlmProvider interface (chat, chatJson) + LlmError
    opencode.ts               OpenCode Go implementation (the only file that knows its URL shapes)
    provider.ts               registry; getLlm()
    prompts.ts                ALL system prompts (conversation, analysis, explain, word-profile)
  speech/                     provider abstraction, swappable
    types.ts                  SpeechToTextProvider / TextToSpeechProvider interfaces, FinalTranscript
    stt-web-speech.ts         Web Speech recognition (continuous, silence watchdog)
    tts-browser.ts            speechSynthesis (keep-alive workaround, voice loading)
  store/                      zustand + persist
    settings-store.ts         asc.settings.v1 — theme, languages, voice, coaching prefs
    session-store.ts          asc.sessions.v1 — sessions/messages/analyses/stats (localStorage only)
    word-practice-store.ts    asc.words.v1 — per-word attempts + cached profiles
  validation/schemas.ts       zod schemas for every API request AND every LLM structured output
  hooks/                      use-conversation (the state machine), use-mic-level, use-hydrated
  scenarios.ts                data-only scenario catalog (+ custom topic)
  languages.ts                language catalog with BCP-47 speech tags
  types.ts                    domain model (TurnAnalysis, ScoredMetric, …)
components/                   ui/ (primitives), layout/, conversation/, onboarding/, practice/, progress/
public/sw.js                  PWA service worker (never caches /api/*)
app/manifest.ts               PWA manifest (served at /manifest.webmanifest)
scripts/                      icon-source.svg + generate-icons.mjs (node scripts/generate-icons.mjs)
```

## Key patterns to preserve

- **Provider abstraction.** Adding Azure STT/TTS or a phoneme assessment API means one new file in `lib/ai/` or `lib/speech/` implementing the existing interface + registry entry. Components must never import vendor files directly.
- **LLM output is untrusted.** Every structured response flows through a zod schema (`AnalysisResponseSchema`, `WordProfileSchema`) in the route; invalid JSON → 502, client hides the card.
- **Honest scoring types.** `ScoredMetric { value: number | null; estimated: boolean }` — null means "no basis", never 0.
- **Hydration.** Persisted stores differ between server and first client render. Gate localStorage-derived UI with `useHydrated()`.
- **Client/server boundaries.** `'use client'` only at leaves that need it. `lib/env.ts` is server-only — never import from browser code.
- **Speech timing.** STT turn: continuous=true with a silence watchdog the learner tunes in Settings → Coaching (`pauseTolerance` 1.6s/2.8s/4.2s, default medium 2.8s). **Session stitching is mandatory**: Android Chrome's engine ends recognition (fires `onend`) after only ~1–3s of silence, long before the configured window — `stt-web-speech.ts` transparently restarts a fresh session and freezes `committed` text, so only OUR watchdog or the user's tap ends the turn (max 15 stitches, 75s ceiling). Delivering on a natural `onend` would make the pause setting feel dead on phones. No-speech watchdog: 8s manual / 5s hands-free; `stop()` flushes via graceful `rec.stop()` + 1.2s fallback.
- **Never trust `speechSynthesis` to call `onend`.** The old pause()/resume() keep-alive nudge WEDGES permanently when a phone backgrounds the tab mid-nudge → session froze in "speaking". Now: a deadline watchdog in `speakReply` (estimated playback + 7s, capped 70s) force-recovers, and the engine's keep-alive only cancel-forces past a generous deadline instead of pausing blindly. Every client fetch also has an `AbortSignal.timeout` ceiling so a dropped mobile network can't hang "thinking" forever.
- **Never append STT result chunks blindly.** Android Chrome re-delivers already-final segments AND can deliver each new final chunk as a CUMULATIVE restatement of the whole sentence ("no" → "no the" → "no the cup" → …) — naive joining explodes into duplicated cascades ("5 words → 100 words"). `stt-web-speech.ts` keeps a running `finalText` and re-merges every `event.results` entry through `mergeFinalChunk`: contained-word subsequences are skipped, full restatements replace, word suffix/prefix overlaps stitch, everything else appends. This is idempotent, so re-delivery and engine resets need no special handling.
- **Hands-free loop.** When `settings.handsFree` is on, `speakReply` bumps `autoListenTick`; an effect reopens the mic ~450ms after the AI's voice ends (or immediately when muted/autoplay-off). If the learner says nothing for 5s, the turn closes quietly (no error card) and waits for a manual tap. One-shot per reply — never an endless loop.
- **Never run a second `getUserMedia`/AudioContext stream while `SpeechRecognition` is active.** Android treats the microphone as exclusive — the recognizer then silently receives nothing (works fine on desktop, broken on phone; the classic mobile-only bug). The orb waveform animates synthetically during listening for exactly this reason.
- **Turn-taking.** The mic stays disabled until AI speech ends (`await speakReply(...)` in the orchestrator). `deliverGreeting()` must be triggered by a user gesture (iOS TTS policy).
- **Language fidelity.** The session opening is AI-GENERATED in the practice language via `/api/conversation` with `opening: true` (the static scenario `startingPrompt` is English-only — used as an idea seed + offline fallback only). The conversation system prompt requires "ALWAYS speak {target}" and instructs the model to reply in the target language even when the learner drifts into another one.

## Data & privacy

- Everything (settings, sessions, analyses, word attempts) lives in this browser's localStorage. Nothing is sent to a server except the text needed for each AI call.
- No analytics, no tracking, no audio persistence.

## Commands

```bash
npm run dev      # localhost:3000
npm run build    # production build — must stay green
npm run lint     # eslint (next/core-web-vitals + next/typescript)
npx tsc --noEmit # strict typecheck
node scripts/generate-icons.mjs   # regenerate PWA icons
```

## OpenCode Go integration gotchas (verified against the live API)

- **`x-opencode-session` is mandatory on every request** — the API returns HTTP 400 `MissingSessionID` without it. The provider mints a UUID when callers don't pass one.
- The default model (`space-bunny-free`, ~2s replies) is a **reasoning model**: hidden `reasoning_content` consumes `max_tokens`. JSON routes need generous budgets (analyze 2500, word-profile 1800) or the visible `content` comes back empty. Timeout is 60s for the same reason. Slower-but-smarter alternatives: `glm-5.3-flash`, `mimo-v2.5`.
- Only chat-completions models work with `lib/ai/opencode.ts`; models served on `/v1/messages` (Anthropic) or `/v1/responses` need their own `LlmProvider` implementation.
- Structured output: `response_format: {type: "json_object"}` is honored, but responses are also defensively extracted with `parseJsonLoose` (markdown fences tolerated) then zod-validated.

## Current phase status

- **Phase 1 (done):** onboarding, sessions, mic→STT→LLM→TTS loop, corrections, estimates, summary, PWA, male/female voice preference.
- **Phase 2 (next):** real pronunciation assessment (Azure `SpeechRecognizer` + `PronunciationAssessment`), word-level scores set `estimated: false`, IPA dictionary source, richer fluency. Implement as new files under `lib/speech/` + `lib/pronunciation.ts` providers; UI already distinguishes estimated vs measured.
- **Phase 3:** auth (better-auth/NextAuth) + per-user server history — introduce a database then (intentionally absent until accounts exist).

## Definition of done for any change

1. `npm run build` and `npx tsc --noEmit` pass.
2. New copy states estimate vs measurement honestly.
3. API errors surface as retryable, human-friendly states (see `describeLlmError`).
4. Mobile: target 360px wide, `100dvh`, safe-area insets respected.
