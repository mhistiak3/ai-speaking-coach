<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FluentVoice — agent guide

**The full architecture, rules, and phase plan live in [AGENT.md](./AGENT.md). Read it first.**

Non-negotiables (summary):

1. Never fake measurements — pronunciation/grammar scores are AI estimates and must render the `AI estimate` badge (`estimated: true`) unless a phoneme provider supplies real scores.
2. API keys are server-only. All LLM traffic goes through `app/api/*`; `lib/env.ts` is the only reader of env vars.
3. Mic audio is transient: never stored, never uploaded except to the configured speech engine.
4. Flow: `idle → listening → processing → thinking → speaking → idle`. Analysis runs in parallel and must never block reply or voice. With `handsFree` on (Settings → AI voice, default on), the mic reopens automatically when the AI stops speaking and closes itself after 5s of silence.
5. Tailwind v4 CSS-first (`app/globals.css` `@theme`). No `tailwind.config.js`.
6. Strict TypeScript; zod for all API + LLM structured-output validation; providers behind interfaces in `lib/ai/` and `lib/speech/`.
7. Dev gotcha: OpenCode Go requires the `x-opencode-session` header on every request; the configured model is a reasoning model, so give `max_tokens` generous budgets (≥1500).
8. Definition of done: `npm run build`, `npx tsc --noEmit`, `npx eslint .` all green; mobile-first (360px, `100dvh`, safe areas).
