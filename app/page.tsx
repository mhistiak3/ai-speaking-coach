import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Gauge,
  Mic,
  ShieldCheck,
  Sparkles,
  Trophy,
  Waves,
} from "lucide-react";

import { AppHeader, MobileNav } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SCENARIOS } from "@/lib/scenarios";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col pb-20 sm:pb-0">
      <AppHeader
        cta={
          <Link href="/onboarding" className="hidden sm:block">
            <Button size="sm">
              Start free <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="flex flex-col items-center pt-14 text-center sm:pt-20">
          <span className="glass flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-ink-soft">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-good" />
            </span>
            Voice-first · AI partner · 16 languages
          </span>

          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Stop studying.
            <br />
            Start <span className="text-brand">speaking</span>.
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
            FluentVoice is a real-time voice conversation with an AI that listens, answers,
            and quietly coaches your pronunciation — like talking to a patient friend, never
            like a quiz.
          </p>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button size="lg" className="w-full">
                <Mic className="size-4" />
                Start speaking now
              </Button>
            </Link>
            <Link href="/practice" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full">
                Browse scenarios
              </Button>
            </Link>
          </div>

          {/* Orb preview */}
          <div className="relative mt-14 flex h-56 w-full max-w-md items-center justify-center">
            <div className="animate-float relative flex size-36 items-center justify-center rounded-full bg-brand">
              <Waves className="size-14 text-white/95" />
              <span className="absolute inset-0 animate-pulse-ring rounded-full border-4 border-brand/40" />
              <span
                className="absolute -inset-4 animate-pulse-ring rounded-full border-2 border-brand-2/30"
                style={{ animationDelay: "0.7s" }}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-8 sm:mt-14">
          <div className="grid gap-4 sm:grid-cols-3">
            <HowCard
              step="1"
              icon={<Mic className="size-5" />}
              title="Pick a scenario & talk"
              text="Restaurant, job interview, daily life — press the orb and just say what comes to mind. We transcribe your speech automatically."
            />
            <HowCard
              step="2"
              icon={<BrainCircuit className="size-5" />}
              title="The AI replies out loud"
              text="A natural conversation partner answers, asks follow-ups, and keeps the talk going — at your level, in your practice language."
            />
            <HowCard
              step="3"
              icon={<Sparkles className="size-5" />}
              title="Coach feedback appears"
              text="Words you likely mispronounced, one important correction, fluency signals — shown after each turn, never interrupting you."
            />
          </div>
        </section>

        {/* Scenario strip */}
        <section className="mt-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">16 ways to practice</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Every conversation is a roleplay with its own rhythm — or invent your own topic.
              </p>
            </div>
            <Link
              href="/practice"
              className="hidden items-center gap-1 text-sm font-semibold text-brand hover:underline sm:flex"
            >
              All scenarios <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {SCENARIOS.slice(0, 10).map((s) => (
              <Link
                key={s.id}
                href="/practice"
                className="glass group flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-brand/40"
              >
                <span className="text-lg transition-transform group-hover:scale-125">{s.emoji}</span>
                {s.title}
              </Link>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<BadgeCheck className="size-5" />}
            title="Honest feedback"
            text="We never fake measurements. Pronunciation numbers are clearly labelled AI estimates until a phoneme-grade provider is connected."
          />
          <FeatureCard
            icon={<Gauge className="size-5" />}
            title="Your pace"
            text="0.75× slower playback, replay any line, mute the voice, or type instead of speaking. The conversation adapts to you."
          />
          <FeatureCard
            icon={<Trophy className="size-5" />}
            title="Visible progress"
            text="Streaks, minutes spoken, difficult-word library, per-session summaries with the exact corrections that matter."
          />
          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="Private by default"
            text="Microphone audio is processed for transcription and never stored. History lives on your device unless you connect a database."
          />
        </section>

        {/* CTA */}
        <section className="my-16 sm:my-20">
          <div className="glass relative rounded-4xl px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="relative text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Your next conversation<br />
              <span className="text-brand">starts with one tap.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              Set your languages, pick a scenario, and speak out loud. Thirty seconds from now
              you&apos;ll be in a real conversation.
            </p>
            <Link href="/onboarding" className="relative mt-8 inline-block">
              <Button size="lg">
                <Mic className="size-4" />
                Begin onboarding
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-edge">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-ink-faint sm:flex-row">
          <span className="flex items-center gap-1.5">
            <Waves className="size-3.5 text-brand" />
            FluentVoice — speak first, perfect later.
          </span>
          <span>Works offline as an installed app · Powered by OpenCode Go</span>
        </div>
      </footer>

      <MobileNav />
    </div>
  );
}

function HowCard({
  step,
  icon,
  title,
  text,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-6 transition-colors hover:border-brand/40">
      <span className="absolute right-4 top-2 text-6xl font-black text-edge group-hover:text-brand/15">
        {step}
      </span>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand/12 text-brand">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass rounded-3xl p-6 transition-colors hover:border-brand/30">
      <span className="text-brand">{icon}</span>
      <h3 className="mt-3 text-sm font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
