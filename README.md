# FluentVoice — AI Speaking Coach

Speak a new language with an AI that actually talks back. Not a quiz, not a
flashcard app — a real-time voice conversation with quiet, honest coaching
layered underneath.

## Highlights

- 🎙️ **Voice-first loop** — tap the orb, speak, the AI answers out loud, then
  you talk again. Space bar = push to talk; typing fallback included.
- 🧠 **Natural conversation partner** — scenario roleplays (restaurant, job
  interview, daily life, developer chat, custom topics…) that ask one question
  at a time and remember context.
- 🗣️ **Pronunciation coaching** — per-turn estimates of tricky words with tips,
  one important correction (never nitpicking), and "Explain in বাংলা" buttons
  in the learner's native language.
- 📖 **Word practice** — IPA, syllable breakdown, stress highlighting, meaning,
  examples, slow/normal audio, record-yourself attempts with match estimates.
- 📊 **Progress** — streaks, minutes spoken, difficult-word library, 14-day
  activity, session summaries with the corrections that matter.
- 🔒 **Honest by design** — the browser speech engine can't measure phonemes,
  so every pronunciation number is clearly labelled **AI estimate**. Real
  phoneme scoring can be plugged in later without UI changes.
- 📱 **PWA** — installable, offline shell, mobile-first with safe-area support,
  polished light/dark themes.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your OpenCode Go key (+ optional Postgres URL)
npm run dev                  # http://localhost:3000
```

| Env var | Purpose |
| --- | --- |
| `OPENCODE_API_KEY` | [OpenCode Go](https://opencode.ai/go) subscription key (server-only) |
| `OPENCODE_BASE_URL` | default `https://opencode.ai/zen/go` |
| `OPENCODE_MODEL` | default `glm-5.3-flash` (chat-completions models only) |
| `DATABASE_URL` | optional Postgres mirror; empty = everything stays on-device |

The app runs end-to-end with **zero** third-party speech costs: browser Web
Speech handles both recognition and voices.

## Privacy

- Microphone audio is used only for live transcription — nothing is recorded
  to disk by this app.
- Browser speech may route audio through the browser vendor's service (e.g.
  Chrome → Google); a dedicated provider can replace it.
- Transcripts and history live in `localStorage` until you opt into the
  Postgres mirror. API keys never reach the browser.

## Architecture

See [AGENT.md](./AGENT.md) for the full guide (provider abstractions, data
model, phase plan, non-negotiables). Key layers:

```
lib/ai/          LLM provider abstraction (OpenCode Go today, swappable)
lib/speech/      STT/TTS provider interfaces + browser implementations
lib/store/       Zustand + localStorage (sessions, settings, word practice)
lib/data/        Optional Postgres mirror (schema auto-applied)
app/api/         Server routes — conversation, analyze, explain, word-profile, progress
```

## Scripts

```bash
npm run dev      # development (Turbopack)
npm run build    # production build
npm start        # serve production build
npm run lint     # eslint (react-hooks + next configs)
node scripts/generate-icons.mjs   # regenerate PWA icons
```
